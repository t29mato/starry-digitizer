import { DigitizerContext } from '@/application/digitizerContext'
import { MASK_MODE } from '@/constants'

// INFO: The dataset-list use cases, extracted from DatasetManager.vue so that
// a host replacing that panel with its own UI does not have to re-derive the
// call order (and the two bugs that came with re-deriving it — see
// datasetOperations.test.ts). Every entry point — the built-in panel, the
// App.vue menu bar and a host's own list — funnels through here so all of
// them behave identically.
//
// NOTE (historyManager.capture): `docs/design/architecture.md` §6.2 records
// the existing convention "capture の呼び出しは Presentation 層の責務とする"
// (inherited from ux-ideas-implementation-design.md), and these functions
// deliberately depart from it: `capture()` lives INSIDE them. The same section
// already names the cost of that convention — "呼び忘れると履歴が飛ぶ" — and
// prescribes this very fix ("そのうえで通知と capture() をメソッド内部に
// 寄せる"). A host that reimplements the panel cannot be expected to know that
// "remove dataset" is a capture point and "switch dataset" is not, so the
// snapshot is taken where the mutation is, not where the click is.
//
// What is NOT here on purpose: `window.confirm`. Whether to ask before
// throwing points away is a presentation decision (wording, modality, i18n),
// so the callers keep it. These functions always do what they are told.

/**
 * The clean-up every "the active dataset is now a different one" path owes.
 *
 * INFO: the mask belongs to the dataset it was painted for — leaving it up
 * would run the next extraction inside the previous row's region — and the
 * axis set has to follow the new row or values come out calibrated against
 * the wrong axes.
 */
function adoptActiveDataset(ctx: DigitizerContext): void {
  const { axisSetRepository, datasetRepository, canvasHandler } = ctx

  axisSetRepository.setActiveAxisSet(datasetRepository.activeDataset.axisSetId)
  // INFO: `clearMask()` reaches the mask canvas through a getter that throws
  // while nothing is attached. A host that mounts panels separately really has
  // a window where the dataset list is up and `CanvasMain` is not, so guard.
  if (canvasHandler.hasCanvases) {
    canvasHandler.clearMask()
  }
  // INFO: this is internal clean-up, not "the user deselected the mask tool",
  // so use setMaskMode(UNSET) rather than exitMaskMode() — reviving the plot
  // mode the user had before the mask would be its own surprise.
  canvasHandler.setMaskMode(MASK_MODE.UNSET)
}

/**
 * Make `id` the active dataset, with the clean-up that belongs to a switch.
 *
 * ORDER IS PART OF THE CONTRACT: `clearPreview()` must run BEFORE
 * `setActiveDataset()`. `Interpolator.clearPreview()` always operates on
 * `datasetRepository.activeDataset` — it drops that dataset's tempPoints and
 * deletes every id in its `manuallyAddedPointIds`. Called after the switch it
 * would therefore delete the manually-added points of the dataset being
 * switched TO. Do not reorder these two lines.
 */
export function activateDataset(ctx: DigitizerContext, id: number): void {
  const { interpolator, datasetRepository } = ctx

  if (interpolator.isActive) {
    interpolator.clearPreview()
  }
  datasetRepository.setActiveDataset(id)
  adoptActiveDataset(ctx)
}

/**
 * Append a dataset and switch to it. The new row inherits the axis set that
 * is active right now, so plotting can continue against the same calibration.
 */
export function addDataset(ctx: DigitizerContext): void {
  const { axisSetRepository, datasetRepository, historyManager } = ctx

  historyManager.capture()
  datasetRepository.createNewDataset()
  datasetRepository.lastDataset.setAxisSetId(axisSetRepository.activeAxisSetId)
  activateDataset(ctx, datasetRepository.lastDatasetId)
}

/**
 * Delete one dataset.
 *
 * INFO: `datasetRepository.removeDataset()` picks the neighbouring row as the
 * new active one by itself, so deleting the active row is also a dataset
 * switch and owes the same clean-up as `activateDataset()`. Deleting some
 * other row is not, and must leave the mask and the axis set alone.
 */
export function removeDataset(ctx: DigitizerContext, id: number): void {
  const { interpolator, datasetRepository, historyManager } = ctx

  if (!datasetRepository.datasets.some((dataset) => dataset.id === id)) return

  historyManager.capture()

  const activeDatasetIdBefore = datasetRepository.activeDatasetId

  // INFO: before the removal, for the same reason activateDataset() clears
  // first — the preview belongs to whichever dataset is active right now.
  if (interpolator.isActive) {
    interpolator.clearPreview()
  }

  datasetRepository.removeDataset(id)

  if (datasetRepository.activeDatasetId !== activeDatasetIdBefore) {
    adoptActiveDataset(ctx)
  }
}

/**
 * Delete every dataset. The repository replaces them with one fresh row.
 *
 * INFO: unlike removeDataset(), the clean-up here is unconditional. The
 * repository's `removeAllDatasets()` always ends on `setActiveDataset(1)`, so
 * when dataset 1 happened to be active the *id* does not change — but the
 * object behind it does: it is a brand-new, empty dataset whose `axisSetId` is
 * back to the default 1. Comparing ids would therefore skip the clean-up
 * exactly when it is still needed.
 */
export function removeAllDatasets(ctx: DigitizerContext): void {
  const { interpolator, datasetRepository, historyManager } = ctx

  historyManager.capture()

  if (interpolator.isActive) {
    interpolator.clearPreview()
  }

  datasetRepository.removeAllDatasets()

  adoptActiveDataset(ctx)
}

/**
 * Empty one dataset without deleting the row.
 *
 * INFO: the interpolation preview is only dropped when the row being cleared
 * is the one the preview belongs to. `clearPreview()` is hard-wired to
 * `activeDataset`, so calling it while another row is the target would delete
 * the ACTIVE row's manually-added points — clearing B would eat A's work.
 */
export function clearDatasetPoints(ctx: DigitizerContext, id: number): void {
  const { interpolator, datasetRepository, historyManager } = ctx

  const dataset = datasetRepository.datasets.find((d) => d.id === id)
  if (!dataset) return

  historyManager.capture()
  dataset.clearPoints()

  // INFO: compare against `activeDataset.id` rather than `activeDatasetId`, so
  // the "view all" mode (activeDatasetId === 0, activeDataset falls back to
  // the first row) is judged by the dataset clearPreview() would actually
  // touch.
  if (interpolator.isActive && datasetRepository.activeDataset.id === id) {
    interpolator.clearPreview()
  }
}

/**
 * Show every dataset at once (activeDatasetId 0).
 *
 * INFO: same order rule as activateDataset(), but no axis set is adopted —
 * "view all" is not one row's calibration, and the axis set the user had
 * stays selected.
 */
export function viewAllDatasets(ctx: DigitizerContext): void {
  const { interpolator, datasetRepository, canvasHandler } = ctx

  if (interpolator.isActive) {
    interpolator.clearPreview()
  }
  datasetRepository.setActiveDataset(0)
  if (canvasHandler.hasCanvases) {
    canvasHandler.clearMask()
  }
  canvasHandler.setMaskMode(MASK_MODE.UNSET)
}
