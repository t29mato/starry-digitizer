import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { addLocalStorageData } from '@/application/utils/localStorageUtils'
import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'

// INFO: Extracted from ExtractorSettings.vue's handleOnClickInterpolatiorSwitch
// so App.vue's View menu can toggle interpolation the same way the panel
// switch does. This isn't just interpolator.setIsActive() — turning
// interpolation off needs to re-materialize manually-added points as real
// points first (see the NOTE below, inherited from the original code), or
// they'd be lost along with the interpolation preview.
export function toggleInterpolation(isActive: boolean): void {
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

  addLocalStorageData('isInterpolatorActive', String(isActive))
}
