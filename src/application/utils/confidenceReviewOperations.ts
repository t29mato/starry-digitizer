import { DigitizerContext } from '@/application/digitizerContext'
import {
  LowConfidencePoint,
  listLowConfidencePoints,
  stepLowConfidencePoint,
} from '@/application/utils/confidenceReview'
import { activateDataset } from '@/application/utils/datasetOperations'

// INFO: Confidence review actions (docs/design/
// auto-extraction-review-design.md, "2."), shared by
// ConfidenceReviewPanel.vue and CanvasMain's `n` / Shift+`n` shortcut, and
// reachable by a host that draws its own review UI. Same layering as
// pointOperations.ts: the undo capture sits with the mutation.

export function currentLowConfidencePoints(
  ctx: DigitizerContext,
): LowConfidencePoint[] {
  return listLowConfidencePoints(
    ctx.datasetRepository.datasets,
    ctx.confidenceReview.threshold,
  )
}

/**
 * Select the next / previous suspicious point (lowest score first), switching
 * to its dataset, and bring it into view, so Delete / arrow keys act on it.
 * Selection only: nothing is captured.
 */
export function goToLowConfidencePoint(
  ctx: DigitizerContext,
  direction: 1 | -1,
): LowConfidencePoint | null {
  const { canvasHandler, confidenceReview, datasetRepository } = ctx
  const target = stepLowConfidencePoint(
    currentLowConfidencePoints(ctx),
    confidenceReview.current,
    direction,
  )
  confidenceReview.setCurrent(target)
  if (!target) return null

  if (datasetRepository.activeDatasetId !== target.datasetId) {
    activateDataset(ctx, target.datasetId)
  }
  const dataset = datasetRepository.activeDataset
  dataset.switchActivatedPoint(target.pointId)
  const point = dataset.points.find((p) => p.id === target.pointId)
  if (point) {
    canvasHandler.setCursor({ xPx: point.xPx, yPx: point.yPx })
    canvasHandler.scrollToCoord(point)
  }
  return target
}

/**
 * Take every point with `score < threshold` out of its dataset, across all
 * datasets. They are kept aside (`scoreRemovedPoints`), not thrown away.
 *
 * @returns how many points were taken out. Nothing is captured when none
 * qualify, so a no-op click leaves no empty undo step.
 */
export function removePointsBelowThreshold(ctx: DigitizerContext): number {
  const { confidenceReview, datasetRepository } = ctx
  const { historyManager, interpolator } = ctx
  if (currentLowConfidencePoints(ctx).length === 0) return 0

  historyManager.capture('points.remove-below-score')
  if (interpolator.isActive) interpolator.clearPreview()
  return datasetRepository.datasets.reduce(
    (sum, dataset) =>
      sum + dataset.removePointsBelowScore(confidenceReview.threshold),
    0,
  )
}

/** Put every point taken out by removePointsBelowThreshold() back. */
export function restoreScoreRemovedPoints(ctx: DigitizerContext): number {
  const { datasetRepository, historyManager, interpolator } = ctx
  const removed = datasetRepository.datasets.reduce(
    (sum, dataset) => sum + dataset.scoreRemovedPoints.length,
    0,
  )
  if (removed === 0) return 0

  historyManager.capture('points.restore-score-removed')
  if (interpolator.isActive) interpolator.clearPreview()
  return datasetRepository.datasets.reduce(
    (sum, dataset) => sum + dataset.restoreScoreRemovedPoints(),
    0,
  )
}
