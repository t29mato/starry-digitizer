import { DigitizerContext } from '@/application/digitizerContext'
import { AxisName } from '@/application/utils/axisOcrMatcher'
import { MANUAL_MODE, POINT_MODE } from '@/constants'
import { PointMode } from '@/@types/types'

// INFO: The axis-set use cases, extracted from AxisSetManager.vue,
// AxisSetSettings.vue and MagnifierSettings.vue for the same reason
// `datasetOperations.ts` and `pointOperations.ts` were extracted: the undo
// SNAPSHOT BELONGS WHERE THE MUTATION IS, NOT WHERE THE CLICK IS. Every one of
// these was a destructive change to project data that the components made
// without capturing, so ⌘Z silently undid whatever the user had done BEFORE —
// a point plotted a minute ago — instead of the thing they had just done. A
// host that replaces the axis-set panel with its own UI cannot be expected to
// re-derive which of these are capture points; going through here it gets undo
// for free.
//
// What counts as a capture point here is "it changes what the digitizer would
// export". Axis coordinates, axis values, the log-scale flags, the tilt
// correction and which axis set a dataset is calibrated against all do.
// `isVisible` (the axis marker overlay) does not, so it is deliberately absent
// — see README "Undo granularity".
//
// What is NOT here on purpose: the confirmation dialog and the OCR call
// itself. Wording/modality/i18n stay with the caller, and the OCR reader needs
// options.assetBaseUrl, which is presentation state.

/**
 * The manual mode a freshly selected axis set implies: keep calibrating while
 * coordinates are missing, otherwise go straight back to plotting.
 */
function adoptActiveAxisSet(ctx: DigitizerContext): void {
  const { axisSetRepository, canvasHandler } = ctx

  if (axisSetRepository.activeAxisSet.nextAxis) {
    canvasHandler.setManualMode(MANUAL_MODE.UNSET)
    return
  }
  canvasHandler.setManualMode(MANUAL_MODE.ADD)
}

/**
 * Make `id` the active axis set AND bind the active dataset to it.
 *
 * INFO: this is not a selection, which is why it captures while
 * `activateDataset()` does not. Picking an axis set REWIRES the active dataset
 * (`dataset.axisSetId`), so every value that dataset exports is now calibrated
 * against different axes. Undo has to be able to put the binding back.
 */
export function activateAxisSet(ctx: DigitizerContext, id: number): void {
  const { axisSetRepository, historyManager } = ctx

  if (!axisSetRepository.axisSets.some((axisSet) => axisSet.id === id)) return

  historyManager.capture()
  applyActiveAxisSet(ctx, id)
}

// INFO: split out so addAxisSet()/removeAxisSet() can reuse the wiring without
// pushing a SECOND snapshot for what the user experienced as one click.
function applyActiveAxisSet(ctx: DigitizerContext, id: number): void {
  const { axisSetRepository, datasetRepository } = ctx

  axisSetRepository.setActiveAxisSet(id)
  datasetRepository.activeDataset.setAxisSetId(id)
  adoptActiveAxisSet(ctx)
}

/**
 * Append an axis set and switch to it (which binds the active dataset to it).
 */
export function addAxisSet(ctx: DigitizerContext): void {
  const { axisSetRepository, historyManager } = ctx

  historyManager.capture()
  axisSetRepository.createNewAxisSet()
  applyActiveAxisSet(ctx, axisSetRepository.lastAxisSetId)
}

/**
 * Delete one axis set and move every dataset that pointed at it onto
 * `alternativeId`.
 *
 * INFO: the caller decides which axis set the orphaned datasets inherit,
 * because that is the one named in the confirmation message the user answered.
 * No dataset may be left pointing at an axis set that no longer exists, so the
 * datasets are re-read here rather than taken as an argument: one moved onto
 * the target while a host's dialog was open must still be rescued.
 *
 * Does nothing (and captures nothing) when either id is unknown or when this
 * is the last axis set — losing the only calibration is not a state the
 * repository can represent.
 */
export function removeAxisSet(
  ctx: DigitizerContext,
  id: number,
  alternativeId: number,
): void {
  const { axisSetRepository, datasetRepository, historyManager } = ctx

  if (id === alternativeId) return
  if (!axisSetRepository.axisSets.some((axisSet) => axisSet.id === id)) return
  if (
    !axisSetRepository.axisSets.some((axisSet) => axisSet.id === alternativeId)
  )
    return

  historyManager.capture()

  axisSetRepository.removeAxisSet(id)

  datasetRepository.datasets
    .filter((dataset) => dataset.axisSetId === id)
    .forEach((dataset) => dataset.setAxisSetId(alternativeId))

  axisSetRepository.setActiveAxisSet(alternativeId)
  adoptActiveAxisSet(ctx)
}

/**
 * Throw away the active axis set's coordinates ("Clear Axes").
 *
 * INFO: this is the calibration the user placed by clicking the figure; it
 * cannot be re-derived, so it is exactly the kind of thing ⌘Z is for.
 * Captures nothing when there is no coordinate to clear.
 */
export function clearAxisSetCoords(ctx: DigitizerContext): void {
  const { axisSetRepository, historyManager } = ctx

  const activeAxisSet = axisSetRepository.activeAxisSet
  if (!activeAxisSet.hasAtLeastOneAxis) return

  historyManager.capture()
  activeAxisSet.clearAxisCoords()
}

/**
 * Overwrite several axis values at once (the OCR "auto-detect" path).
 *
 * ORDER IS PART OF THE CONTRACT, the same as `extractPoints()`: run the
 * detection FIRST and hand the result in here, so a failed or empty detection
 * leaves no "nothing changed" entry on the undo stack.
 *
 * One capture for the whole batch: the user pressed one button, so ⌘Z has to
 * put all four values back in one go.
 *
 * INFO: typing a value into the x1/x2/y1/y2 fields deliberately does NOT come
 * through here — see README "Undo granularity" for why text input is left to
 * the browser's own undo.
 */
export function setAxisValues(
  ctx: DigitizerContext,
  values: Partial<Record<AxisName, number>>,
): void {
  const { axisSetRepository, historyManager } = ctx

  const activeAxisSet = axisSetRepository.activeAxisSet
  const entries = (Object.entries(values) as [AxisName, number | undefined][])
    .filter(
      (entry): entry is [AxisName, number] =>
        entry[1] !== undefined && !isNaN(entry[1]),
    )
    // INFO: a value that is already what it would be set to is not a change;
    // if none of them is, the whole batch must not push an entry.
    .filter(([axisName, value]) => activeAxisSet[axisName].value !== value)

  if (entries.length === 0) return

  historyManager.capture()

  entries.forEach(([axisName, value]) => {
    switch (axisName) {
      case 'x1':
        activeAxisSet.setX1Value(value)
        return
      case 'x2':
        activeAxisSet.setX2Value(value)
        return
      case 'y1':
        activeAxisSet.setY1Value(value)
        return
      case 'y2':
        activeAxisSet.setY2Value(value)
        return
    }
  })
}

/**
 * Flip the X or Y axis between linear and logarithmic.
 *
 * INFO: one click that changes EVERY value the dataset exports, so it is
 * undoable even though it looks like a mere setting.
 */
export function setLogScale(
  ctx: DigitizerContext,
  axis: 'x' | 'y',
  value: boolean,
): void {
  const { axisSetRepository, historyManager } = ctx

  const activeAxisSet = axisSetRepository.activeAxisSet
  const current =
    axis === 'x' ? activeAxisSet.xIsLogScale : activeAxisSet.yIsLogScale
  if (current === value) return

  historyManager.capture()
  if (axis === 'x') {
    activeAxisSet.setXIsLogScale(value)
    return
  }
  activeAxisSet.setYIsLogScale(value)
}

/**
 * Turn the tilt correction on or off. Same reasoning as `setLogScale()`: it
 * changes the numbers, not just the picture.
 */
export function setConsiderGraphTilt(
  ctx: DigitizerContext,
  value: boolean,
): void {
  const { axisSetRepository, historyManager } = ctx

  const activeAxisSet = axisSetRepository.activeAxisSet
  if (activeAxisSet.considerGraphTilt === value) return

  historyManager.capture()
  activeAxisSet.considerGraphTilt = value
}

/**
 * Switch between the 2-point and 4-point calibration modes.
 *
 * INFO: captured because going back to 2 points also switches the tilt
 * correction off (AxisSetSettings watches `pointMode` for that) — a silent
 * change to the exported values that the user did not ask for by name. One
 * snapshot covers both, since the watcher runs after this mutation.
 */
export function setPointMode(ctx: DigitizerContext, mode: PointMode): void {
  const { axisSetRepository, historyManager } = ctx

  const activeAxisSet = axisSetRepository.activeAxisSet
  const normalized: PointMode =
    mode === POINT_MODE.FOUR_POINTS
      ? POINT_MODE.FOUR_POINTS
      : POINT_MODE.TWO_POINTS
  if (activeAxisSet.pointMode === normalized) return

  historyManager.capture()
  activeAxisSet.pointMode = normalized
}
