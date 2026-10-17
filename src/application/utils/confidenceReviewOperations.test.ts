import {
  goToLowConfidencePoint,
  removePointsBelowThreshold,
  restoreScoreRemovedPoints,
} from './confidenceReviewOperations'
import { buildEditLog, loadAutoExtraction } from './autoExtractionOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'

describe('confidence review operations', () => {
  let ctx: DigitizerContext

  beforeEach(async () => {
    ctx = createDigitizerContext()
    await loadAutoExtraction(ctx, {
      version: 1,
      series: [
        { label: 'A', points_px: [[10, 10], [20, 20]], scores: [0.4, 0.9] },
        { label: 'B', points_px: [[30, 30]], scores: [0.1] },
      ],
    })
  })

  test('goes to the lowest point first, switching dataset and selecting it', () => {
    const scroll = jest
      .spyOn(ctx.canvasHandler, 'scrollToCoord')
      .mockImplementation(() => undefined)

    expect(goToLowConfidencePoint(ctx, 1)).toMatchObject({
      datasetId: 2,
      score: 0.1,
    })
    expect(ctx.datasetRepository.activeDatasetId).toBe(2)
    expect(ctx.datasetRepository.activeDataset.activePointIds).toEqual([1])
    expect(ctx.canvasHandler.cursor).toEqual({ xPx: 30, yPx: 30 })
    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ xPx: 30, yPx: 30 }),
    )

    expect(goToLowConfidencePoint(ctx, 1)).toMatchObject({
      datasetId: 1,
      pointId: 1,
    })
    expect(ctx.datasetRepository.activeDatasetId).toBe(1)

    ctx.confidenceReview.setThreshold(0)
    expect(goToLowConfidencePoint(ctx, 1)).toBeNull()
    expect(ctx.confidenceReview.current).toBeNull()
  })

  test('remove below threshold and restore, both undoable and in the edit log', () => {
    expect(removePointsBelowThreshold(ctx)).toBe(2)
    expect(ctx.datasetRepository.datasets.map((d) => d.points.length)).toEqual(
      [1, 0],
    )
    const log = buildEditLog(ctx)
    expect(log?.summary.points).toMatchObject({
      deleted: 2,
      deleted_by_threshold: 2,
    })
    expect(log?.score_threshold).toBe(0.5)
    expect(log?.events.map((e) => e.action)).toEqual([
      'points.remove-below-score',
    ])

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.datasets.map((d) => d.points.length)).toEqual(
      [2, 1],
    )
    ctx.historyManager.redo()
    expect(restoreScoreRemovedPoints(ctx)).toBe(2)
    expect(buildEditLog(ctx)?.summary.points.deleted).toBe(0)
  })

  test('nothing to remove or restore leaves no empty undo step', () => {
    ctx.confidenceReview.setThreshold(0)
    expect(removePointsBelowThreshold(ctx)).toBe(0)
    expect(restoreScoreRemovedPoints(ctx)).toBe(0)
    expect(ctx.historyManager.canUndo).toBe(false)
  })
})
