import { DigitizerContext } from '@/application/digitizerContext'
import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'

// INFO: this lives in presentation, not application, because it reaches for
// forceRenderCanvasPoints (a rendering workaround) and is only ever called from
// components. It used to sit in application/utils and was the last place where
// application imported from presentation.
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
  const { interpolator, datasetRepository } = ctx
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
