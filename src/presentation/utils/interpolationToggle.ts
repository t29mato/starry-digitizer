import { DigitizerContext } from '@/application/digitizerContext'
import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'

// INFO: this lives in presentation, not application, because it reaches for
// forceRenderCanvasPoints (a rendering workaround) and is only ever called from
// components. It used to sit in application/utils and was the last place where
// application imported from presentation. It still owns its undo snapshot the
// way the application-layer use cases do (see the capture note below) — the
// layer it sits in is decided by the rendering hack, not by the history.
//
// INFO: Extracted from ExtractorSettings.vue's handleOnClickInterpolatiorSwitch
// so App.vue's View menu can toggle interpolation the same way the panel
// switch does. This isn't just interpolator.setIsActive() — turning
// interpolation off needs to re-materialize manually-added points as real
// points first (see the NOTE below, inherited from the original code), or
// they'd be lost along with the interpolation preview.
export function toggleInterpolation(
  ctx: DigitizerContext,
  isActive: boolean,
): void {
  const { interpolator, datasetRepository, historyManager } = ctx

  // INFO (historyManager.capture): turning interpolation OFF is not a view
  // toggle — the re-materialization below DELETES every anchor point and adds
  // a copy of it back under a NEW id, at the END of `points`. Ids and order
  // are what the exported rows are made of, so this has to be undoable. It
  // used to capture nothing, which meant a ⌘Z right after the switch undid
  // whatever the user had done before it (a point plotted a minute ago) and
  // said nothing about it.
  //
  // Only the OFF direction, and only when there is an anchor point to
  // re-materialize: turning interpolation ON touches `tempPoints` alone, which
  // no snapshot holds (see HistorySnapshot), so capturing there would push an
  // entry whose undo does nothing visible — and cost the user a ⌘Z press to
  // get past. Same rule as a failed extraction in pointOperations.ts.
  //
  // The capture lives here rather than in the two callers (the panel switch
  // and App.vue's View menu) for the reason datasetOperations.ts gives: the
  // snapshot belongs where the mutation is, not where the click is.
  const willRematerializePoints =
    !isActive &&
    datasetRepository.activeDataset.manuallyAddedPointIds.length > 0
  if (willRematerializePoints) {
    historyManager.capture()
  }

  interpolator.setIsActive(isActive)

  if (isActive) {
    interpolator.updatePreview()
  } else {
    // NOTE: A temporary workaround to ensure that data points remain after
    // turning off the interpolation function. A redesign is essential.
    const dataset = datasetRepository.activeDataset
    const addedPointIds: number[] = []
    dataset.points
      .filter((p) => dataset.manuallyAddedPointIds.includes(p.id))
      .forEach((p) => {
        dataset.addPoint(p.xPx, p.yPx)
        addedPointIds.push(dataset.lastPointId)
      })

    interpolator.clearPreview()

    addedPointIds.forEach((pId) => {
      dataset.addManuallyAddedPointId(pId)
    })
  }

  // HACK: Since tempPoints are not drawn, force rendering as a temporary
  // measure. Fundamental solution required
  forceRenderCanvasPoints(datasetRepository)
}
