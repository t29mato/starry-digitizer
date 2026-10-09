import { reactive } from 'vue'
import {
  canvasHandler as rawCanvasHandler,
  confidenceReview,
  historyManager,
  interpolator,
} from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import {
  LowConfidencePoint,
  listLowConfidencePoints,
  stepLowConfidencePoint,
} from '@/application/utils/confidenceReview'
import { MASK_MODE } from '@/constants'

// INFO: Confidence review actions (docs/design/
// auto-extraction-review-design.md, "2."), shared by
// ConfidenceReviewPanel.vue and CanvasMain's `n` / Shift+`n` shortcut.
// Mutations go through reactive proxies — see autoExtractionOperations.ts.
const axisSets = reactive(axisSetRepository)
const datasets = reactive(datasetRepository)
const canvasHandler = reactive(rawCanvasHandler)

export function currentLowConfidencePoints(): LowConfidencePoint[] {
  return listLowConfidencePoints(datasets.datasets, confidenceReview.threshold)
}

// INFO: selects the next/previous suspicious point, switching to its
// dataset, and brings it into view, so Delete / arrow keys act on it
export function goToLowConfidencePoint(
  direction: 1 | -1,
): LowConfidencePoint | null {
  const target = stepLowConfidencePoint(
    currentLowConfidencePoints(),
    confidenceReview.current,
    direction,
  )
  confidenceReview.setCurrent(target)
  if (!target) return null

  if (datasets.activeDatasetId !== target.datasetId) {
    // INFO: same as switching datasets in DatasetManager.vue
    interpolator.isActive && interpolator.clearPreview()
    datasets.setActiveDataset(target.datasetId)
    axisSets.setActiveAxisSet(datasets.activeDataset.axisSetId)
    canvasHandler.clearMask()
    canvasHandler.maskMode = MASK_MODE.UNSET
  }
  const dataset = datasets.activeDataset
  dataset.switchActivatedPoint(target.pointId)
  const point = dataset.points.find((p) => p.id === target.pointId)
  if (point) {
    canvasHandler.setCursor({ xPx: point.xPx, yPx: point.yPx })
    canvasHandler.scrollToCoord(point)
  }
  return target
}

export function removePointsBelowThreshold(): number {
  historyManager.capture('points.remove-below-score')
  interpolator.isActive && interpolator.clearPreview()
  return datasets.datasets.reduce(
    (sum, dataset) =>
      sum + dataset.removePointsBelowScore(confidenceReview.threshold),
    0,
  )
}

export function restoreScoreRemovedPoints(): number {
  historyManager.capture('points.restore-score-removed')
  interpolator.isActive && interpolator.clearPreview()
  return datasets.datasets.reduce(
    (sum, dataset) => sum + dataset.restoreScoreRemovedPoints(),
    0,
  )
}
