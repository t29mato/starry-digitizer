import {
  goToLowConfidencePoint,
  removePointsBelowThreshold,
  restoreScoreRemovedPoints,
} from './confidenceReviewOperations'
import { buildEditLog, loadAutoExtraction } from './autoExtractionOperations'
import {
  canvasHandler,
  confidenceReview,
  historyManager,
} from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

describe('confidence review operations', () => {
  beforeEach(async () => {
    confidenceReview.setThreshold(0.5)
    confidenceReview.setCurrent(null)
    await loadAutoExtraction({
      version: 1,
      series: [
        { label: 'A', points_px: [[10, 10], [20, 20]], scores: [0.4, 0.9] },
        { label: 'B', points_px: [[30, 30]], scores: [0.1] },
      ],
    })
  })

  test('goes to the lowest point first, switching dataset and selecting it', () => {
    const scroll = jest
      .spyOn(canvasHandler, 'scrollToCoord')
      .mockImplementation(() => undefined)
    // INFO: no canvas DOM in Jest
    jest.spyOn(canvasHandler, 'clearMask').mockImplementation(() => undefined)

    expect(goToLowConfidencePoint(1)).toMatchObject({ datasetId: 2, score: 0.1 })
    expect(datasetRepository.activeDatasetId).toBe(2)
    expect(datasetRepository.activeDataset.activePointIds).toEqual([1])
    expect(canvasHandler.cursor).toEqual({ xPx: 30, yPx: 30 })
    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ xPx: 30, yPx: 30 }),
    )

    expect(goToLowConfidencePoint(1)).toMatchObject({ datasetId: 1, pointId: 1 })
    expect(datasetRepository.activeDatasetId).toBe(1)

    confidenceReview.setThreshold(0)
    expect(goToLowConfidencePoint(1)).toBeNull()
    expect(confidenceReview.current).toBeNull()
  })

  test('remove below threshold and restore, both undoable and in the edit log', () => {
    expect(removePointsBelowThreshold()).toBe(2)
    expect(datasetRepository.datasets.map((d) => d.points.length)).toEqual([
      1, 0,
    ])
    const log = buildEditLog()
    expect(log?.summary.points).toMatchObject({
      deleted: 2,
      deleted_by_threshold: 2,
    })
    expect(log?.score_threshold).toBe(0.5)
    expect(log?.events.map((e) => e.action)).toEqual([
      'points.remove-below-score',
    ])

    historyManager.undo()
    expect(datasetRepository.datasets.map((d) => d.points.length)).toEqual([
      2, 1,
    ])
    historyManager.redo()
    expect(restoreScoreRemovedPoints()).toBe(2)
    expect(buildEditLog()?.summary.points.deleted).toBe(0)
  })
})
