import {
  buildDataDocument,
  buildEditLog,
  currentReviewDiff,
  endReview,
  loadAutoExtraction,
} from './autoExtractionOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { DigitizerError } from '@/application/errors'

const doc = {
  version: 1,
  axes: {
    x: {
      scale: 'linear',
      ticks: [
        { px: 100, value: 0 },
        { px: 300, value: 10 },
      ],
    },
    y: {
      scale: 'linear',
      ticks: [
        { px: 400, value: 0 },
        { px: 200, value: 10 },
      ],
    },
  },
  series: [
    { label: 'A', points_px: [[150, 350], [250, 250]], scores: [0.9, 0.1] },
    { label: 'B', points_value: [[5, 5]] },
  ],
  source: { extractor: 'markernet-v2', run: 'r1' },
}

describe('autoExtractionOperations (no image element loaded)', () => {
  let ctx: DigitizerContext
  beforeEach(() => {
    ctx = createDigitizerContext()
  })

  test('loadAutoExtraction replaces the state and starts a review', async () => {
    ctx.datasetRepository.activeDataset.addPoint(1, 1)
    ctx.historyManager.capture()

    const result = await loadAutoExtraction(ctx, JSON.stringify(doc))

    expect(result).toEqual({
      series: 2,
      points: 3,
      calibration: expect.objectContaining({ x: expect.any(Object) }),
      warnings: [],
    })
    expect(ctx.axisSetRepository.axisSets).toHaveLength(1)
    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual(['A', 'B'])
    expect(ctx.datasetRepository.activeDatasetId).toBe(1)
    expect(ctx.datasetRepository.datasets[1].points[0]).toMatchObject({
      xPx: 200,
      yPx: 300,
    })
    expect(ctx.historyManager.canUndo).toBe(false)
    expect(ctx.reviewSession.isActive).toBe(true)
    expect(ctx.reviewSession.data?.source).toEqual(doc.source)
  })

  test('edits are recorded as events and show up in the edit log', async () => {
    await loadAutoExtraction(ctx, doc)

    ctx.historyManager.capture('point.delete')
    ctx.datasetRepository.datasets[0].clearPoint(2)
    ctx.historyManager.capture('point.add')
    ctx.datasetRepository.datasets[0].addPoint(10, 10)

    expect(currentReviewDiff(ctx)?.summary.points).toMatchObject({
      deleted: 1,
      added: 1,
    })
    const log = buildEditLog(ctx)
    expect(log?.events.map((e) => e.action)).toEqual([
      'point.delete',
      'point.add',
    ])
    expect(log?.summary.points).toMatchObject({ deleted: 1, added: 1, kept: 2 })
    expect(log?.final.series[0].origins).toEqual([[0, 0], null])

    // INFO: undo is diffed too — the deletion and the addition vanish
    ctx.historyManager.undo()
    ctx.historyManager.undo()
    expect(buildEditLog(ctx)?.summary.points).toMatchObject({
      deleted: 0,
      added: 0,
      kept: 3,
    })
    expect(buildEditLog(ctx)?.summary.events).toEqual({
      total: 4,
      undo: 2,
      redo: 0,
    })
  })

  test('buildDataDocument works with or without a review', async () => {
    await loadAutoExtraction(ctx, doc)
    endReview(ctx)
    const data = buildDataDocument(ctx)
    expect(data.source).toEqual({ tool: 'starry-digitizer', based_on: null })
    expect(data.series.map((s) => s.label)).toEqual(['A', 'B'])
    expect(data.series[1].points_value?.[0][0]).toBeCloseTo(5)
  })

  test('a document without series still leaves one dataset to work in', async () => {
    await loadAutoExtraction(ctx, { version: 1, series: [] })
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    expect(ctx.datasetRepository.activeDataset.points).toEqual([])
  })

  test('invalid documents throw and leave the review untouched', async () => {
    const failure = loadAutoExtraction(ctx, { version: 2, series: [] })
    await expect(failure).rejects.toThrow('version must be 1')
    await expect(failure).rejects.toBeInstanceOf(DigitizerError)
    await expect(failure).rejects.toMatchObject({
      code: 'AUTO_EXTRACTION_INVALID',
    })
    expect(ctx.reviewSession.isActive).toBe(false)
    expect(buildEditLog(ctx)).toBeNull()
  })

  test('two contexts review independently', async () => {
    const other = createDigitizerContext()
    await loadAutoExtraction(ctx, doc)
    expect(ctx.reviewSession.isActive).toBe(true)
    expect(other.reviewSession.isActive).toBe(false)
    expect(other.datasetRepository.datasets).toHaveLength(1)
  })

  test('the review session follows the project through toProjectDTO / restoreProject', async () => {
    await loadAutoExtraction(ctx, doc)
    ctx.historyManager.capture('point.delete')
    ctx.datasetRepository.datasets[0].clearPoint(1)

    const saved = ctx.projectService.toProjectDTO()
    const reopened = createDigitizerContext()
    reopened.projectService.restoreProject(saved)

    expect(buildEditLog(reopened)?.summary.points).toMatchObject({
      deleted: 1,
    })
    expect(buildEditLog(reopened)?.events.map((e) => e.action)).toEqual([
      'point.delete',
    ])
  })
})
