import {
  isUntouchedDraft,
  runServerExtraction,
} from './serverExtractionOperations'
import {
  configureAutoService,
  isImageChangedError,
} from './autoFeatureOperations'
import { addAxisSet } from './axisSetOperations'
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

// INFO: re-extracting (a new threshold, say) replaces the drafts nobody has
// touched since, keeps the ones someone edited, and stays ONE undo step.
describe('Server Extraction: re-extract', () => {
  const second = {
    method: 'markernet',
    series: [
      { label: 'circle', points: [[99.5, 99.5]], point_scores: [0.7] },
      { label: 'square', points: [[199.5, 199.5]], point_scores: [0.6] },
    ],
  }
  const setupSequence = async (...bodies: unknown[]) => {
    const ctx = createDigitizerContext()
    const extract = jest.fn()
    bodies.forEach((body) => extract.mockResolvedValueOnce(body))
    const service: AutoService = {
      capabilities: async () => ['markernet', 'lineformer'],
      calibrate: jest.fn(),
      extract,
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    return ctx
  }
  const names = (ctx: DigitizerContext) =>
    ctx.datasetRepository.datasets.map((d) => d.name)

  test('untouched drafts of the same method are replaced, not duplicated', async () => {
    const ctx = await setupSequence(answer, second)
    await runServerExtraction(ctx, { method: 'markernet' })
    const outcome = await runServerExtraction(ctx, { method: 'markernet' })

    expect(outcome.replacedDraftCount).toBe(2)
    expect(outcome.datasetIds).toEqual([1, 2])
    expect(names(ctx)).toEqual(['circle (markernet)', 'square (markernet)'])
    expect(ctx.datasetRepository.datasets[0].points).toEqual([
      { id: 1, xPx: 100, yPx: 100, score: 0.7 },
    ])
    expect(
      ctx.datasetRepository.datasets.every((d) =>
        isUntouchedDraft(ctx, d, 'markernet'),
      ),
    ).toBe(true)
  })

  test('one Undo goes back to the first Extract, whose drafts are still replaceable', async () => {
    const ctx = await setupSequence(answer, second, second)
    await runServerExtraction(ctx, { method: 'markernet' })
    await runServerExtraction(ctx, { method: 'markernet' })

    ctx.historyManager.undo()
    expect(names(ctx)).toEqual(['x=0.1 (markernet)', 'square (markernet)'])
    expect(ctx.datasetRepository.datasets[0].points).toHaveLength(2)

    // INFO: the restored drafts are recognised as untouched again
    await runServerExtraction(ctx, { method: 'markernet' })
    expect(names(ctx)).toEqual(['circle (markernet)', 'square (markernet)'])

    ctx.historyManager.undo()
    ctx.historyManager.undo()
    expect(names(ctx)).toEqual(['dataset 1'])
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('an edited draft is kept and the new draft gets a name of its own', async () => {
    const ctx = await setupSequence(answer, answer)
    await runServerExtraction(ctx, { method: 'markernet' })
    // INFO: the curator moves one point of the first draft
    ctx.datasetRepository.datasets[0].points[0].xPx = 12
    expect(
      isUntouchedDraft(ctx, ctx.datasetRepository.datasets[0], 'markernet'),
    ).toBe(false)

    const outcome = await runServerExtraction(ctx, { method: 'markernet' })
    expect(outcome.replacedDraftCount).toBe(1)
    expect(names(ctx)).toEqual([
      'x=0.1 (markernet)',
      'x=0.1 (markernet) 2',
      'square (markernet)',
    ])
    expect(ctx.datasetRepository.datasets[0].points[0].xPx).toBe(12)

    ctx.historyManager.undo()
    expect(names(ctx)).toEqual(['x=0.1 (markernet)', 'square (markernet)'])
    expect(ctx.datasetRepository.datasets[0].points[0].xPx).toBe(12)
  })

  test('renaming, adding a point or taking low scores out counts as an edit', async () => {
    const ctx = await setupSequence(answer)
    await runServerExtraction(ctx, { method: 'markernet' })
    const [first, second] = ctx.datasetRepository.datasets
    first.name = 'Bi2Te3'
    expect(isUntouchedDraft(ctx, first, 'markernet')).toBe(false)
    second.addPoint(5, 5)
    expect(isUntouchedDraft(ctx, second, 'markernet')).toBe(false)

    const other = await setupSequence(answer)
    await runServerExtraction(other, { method: 'markernet' })
    other.datasetRepository.datasets[0].removePointsBelowScore(0.5)
    expect(
      isUntouchedDraft(other, other.datasetRepository.datasets[0], 'markernet'),
    ).toBe(false)
  })

  test('fewer series than last time: the surplus untouched drafts go', async () => {
    const one = {
      method: 'markernet',
      series: [{ label: 'circle', points: [[9.5, 9.5]], point_scores: [0.9] }],
    }
    const ctx = await setupSequence(answer, one)
    await runServerExtraction(ctx, { method: 'markernet' })
    await runServerExtraction(ctx, { method: 'markernet' })
    expect(names(ctx)).toEqual(['circle (markernet)'])
    expect(ctx.datasetRepository.activeDatasetId).toBe(1)
    ctx.historyManager.undo()
    expect(names(ctx)).toEqual(['x=0.1 (markernet)', 'square (markernet)'])
  })

  test('drafts of another method, or on another axis set, are left alone', async () => {
    const lines = {
      method: 'lineformer',
      series: [{ label: 'line 1', points: [[9.5, 9.5]] }],
    }
    const ctx = await setupSequence(answer, lines, answer)
    await runServerExtraction(ctx, { method: 'markernet' })
    await runServerExtraction(ctx, { method: 'lineformer' })
    expect(names(ctx)).toEqual([
      'x=0.1 (markernet)',
      'square (markernet)',
      'line 1 (lineformer)',
    ])

    addAxisSet(ctx)
    await runServerExtraction(ctx, { method: 'markernet' })
    expect(names(ctx)).toEqual([
      'x=0.1 (markernet)',
      'square (markernet)',
      'line 1 (lineformer)',
      'x=0.1 (markernet) 2',
      'square (markernet) 2',
    ])
  })
})

// INFO: an answer is for the image it was asked for
describe('Server Extraction: the image changes while it runs', () => {
  const deferredSetup = async () => {
    const ctx = createDigitizerContext()
    let resolve: (body: unknown) => void = () => undefined
    let seenSignal: AbortSignal | undefined
    const service: AutoService = {
      capabilities: async () => ['markernet'],
      calibrate: jest.fn(),
      extract: jest.fn(
        (_image, _request, options?: { signal?: AbortSignal }) => {
          seenSignal = options?.signal
          return new Promise((r) => (resolve = r))
        },
      ),
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    return {
      ctx,
      resolve: (body: unknown) => resolve(body),
      signal: () => seenSignal,
    }
  }

  test('a late answer is dropped, not applied to the new image', async () => {
    const { ctx, resolve } = await deferredSetup()
    const running = runServerExtraction(ctx, { method: 'markernet' })
    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,b3RoZXI=')
    resolve(answer)

    const error = await running.catch((e) => e)
    expect(isImageChangedError(error)).toBe(true)
    expect(error).toMatchObject({ code: 'AUTO_SERVICE_FAILED' })
    expect(ctx.datasetRepository.datasets.map((d) => d.name)).toEqual([
      'dataset 1',
    ])
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('the signal reaches the service; aborting drops the answer', async () => {
    const { ctx, resolve, signal } = await deferredSetup()
    const controller = new AbortController()
    const running = runServerExtraction(ctx, {
      method: 'markernet',
      signal: controller.signal,
    })
    expect(signal()).toBe(controller.signal)
    controller.abort()
    resolve(answer)

    expect(isImageChangedError(await running.catch((e) => e))).toBe(true)
    expect(ctx.datasetRepository.datasets).toHaveLength(1)
    expect(ctx.historyManager.canUndo).toBe(false)
  })

  test('a service that rejects because it was aborted reports a cancel', async () => {
    const ctx = createDigitizerContext()
    const service: AutoService = {
      capabilities: async () => ['markernet'],
      calibrate: jest.fn(),
      extract: jest.fn(
        (_image, _request, options?: { signal?: AbortSignal }) =>
          new Promise(
            (_resolve, reject) =>
              options?.signal?.addEventListener('abort', () =>
                reject(new Error('aborted')),
              ),
          ),
      ),
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    const controller = new AbortController()
    const running = runServerExtraction(ctx, {
      method: 'markernet',
      signal: controller.signal,
    })
    controller.abort()
    expect(isImageChangedError(await running.catch((e) => e))).toBe(true)
  })

  test('an ordinary failure is not mistaken for a cancel', async () => {
    const ctx = createDigitizerContext()
    const service: AutoService = {
      capabilities: async () => ['markernet'],
      calibrate: jest.fn(),
      extract: jest.fn(async () => {
        throw new Error('HTTP 500')
      }),
    }
    await configureAutoService(ctx, service)
    ctx.canvasHandler.setUploadImageUrl(PNG)
    const error = await runServerExtraction(ctx, {
      method: 'markernet',
      signal: new AbortController().signal,
    }).catch((e) => e)
    expect(isImageChangedError(error)).toBe(false)
  })
})
