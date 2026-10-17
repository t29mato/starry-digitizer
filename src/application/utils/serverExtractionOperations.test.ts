import { runServerExtraction } from './serverExtractionOperations'
import { configureAutoService } from './autoFeatureOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'

const PNG = 'data:image/png;base64,aGVsbG8='

const answer = {
  method: 'markernet',
  series: [
    {
      label: 'circle',
      points: [
        [9.5, 19.5],
        [29.5, 39.5],
      ],
      point_scores: [0.9, 0.2],
      legend_label: 'x=0.1',
    },
    { label: 'square', points: [[49.5, 59.5]], point_scores: [0.8] },
  ],
}

const setup = async (
  body: unknown = answer,
): Promise<{ ctx: DigitizerContext; service: AutoService }> => {
  const ctx = createDigitizerContext()
  const service: AutoService = {
    capabilities: async () => ['markernet'],
    calibrate: jest.fn(),
    extract: jest.fn(async () => body),
  }
  await configureAutoService(ctx, service)
  ctx.canvasHandler.setUploadImageUrl(PNG)
  return { ctx, service }
}

describe('Server Extraction', () => {
  test('each series becomes a draft dataset with per-point scores (pixels only)', async () => {
    const { ctx, service } = await setup()
    const { datasetIds } = await runServerExtraction(ctx, {
      method: 'markernet',
      params: { threshold: 0.4 },
    })

    expect(service.extract).toHaveBeenCalledWith(expect.any(Blob), {
      method: 'markernet',
      params: { threshold: 0.4 },
      area: undefined,
    })
    // INFO: the empty "dataset 1" of a fresh project is reused
    expect(datasetIds).toEqual([1, 2])
    const [first, second] = ctx.datasetRepository.datasets
    expect(first.name).toBe('x=0.1 (markernet)')
    expect(second.name).toBe('square (markernet)')
    expect(first.points).toEqual([
      { id: 1, xPx: 10, yPx: 20, score: 0.9 },
      { id: 2, xPx: 30, yPx: 40, score: 0.2 },
    ])
    expect(first.visiblePointIds).toEqual([1, 2])
    expect(ctx.datasetRepository.activeDatasetId).toBe(1)
  })

  test('one Extract is one undo step, however many datasets it made', async () => {
    const { ctx } = await setup()
    ctx.datasetRepository.activeDataset.addPoint(1, 1)
    await runServerExtraction(ctx, { method: 'markernet' })
    expect(ctx.datasetRepository.datasets).toHaveLength(3)

    ctx.historyManager.undo()
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    expect(ctx.datasetRepository.activeDataset.points).toHaveLength(1)
    expect(ctx.historyManager.canUndo).toBe(false)

    ctx.historyManager.redo()
    expect(ctx.datasetRepository.datasets).toHaveLength(3)
  })

  test('the plot area is sent as the backend area', async () => {
    const { ctx, service } = await setup()
    ctx.axisSetRepository.activeAxisSet.plotArea = {
      xPx: 100,
      yPx: 50,
      widthPx: 400,
      heightPx: 350,
    }
    await runServerExtraction(ctx, { method: 'markernet' })
    expect(service.extract).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.objectContaining({
        area: { x0: 99.5, y0: 49.5, x1: 499.5, y1: 399.5 },
      }),
    )
  })

  test('no series: nothing changes and nothing is captured', async () => {
    const { ctx } = await setup({ method: 'markernet', series: [] })
    const { datasetIds } = await runServerExtraction(ctx, {
      method: 'markernet',
    })
    expect(datasetIds).toEqual([])
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('a method that was not granted is refused before any request', async () => {
    const { ctx, service } = await setup()
    await expect(
      runServerExtraction(ctx, { method: 'lineformer' }),
    ).rejects.toMatchObject({ code: 'AUTO_SERVICE_FAILED' })
    expect(service.extract).not.toHaveBeenCalled()
  })

  test('scored drafts feed the confidence review', async () => {
    const { ctx } = await setup()
    await runServerExtraction(ctx, { method: 'markernet' })
    ctx.confidenceReview.setThreshold(0.5)
    const low = ctx.datasetRepository.datasets
      .flatMap((d) => d.points)
      .filter((p) => (p.score ?? 1) < 0.5)
    expect(low).toHaveLength(1)
  })
})
