import {
  acceptLegendSuggestion,
  base64OfDataUrl,
  LEGEND_ACCEPT_ACTION,
  LEGEND_ACTION,
  readLegendNames,
} from './legendOperations'
import {
  isUntouchedDraft,
  runServerExtraction,
} from './serverExtractionOperations'
import { configureAutoService } from './autoFeatureOperations'
import {
  createDigitizerContext,
  DigitizerContext,
} from '@/application/digitizerContext'
import { AutoService } from '@/application/services/autoService/autoService'

const PNG = 'data:image/png;base64,aGVsbG8='

const extraction = {
  method: 'markernet',
  series: [
    { label: 'circle', points: [[9.5, 19.5]] },
    { label: 'square', points: [[29.5, 39.5]] },
    { label: 'triangle', points: [[49.5, 59.5]] },
  ],
}

// INFO: the backend's 200 envelope around the reader's JSON (wpd-auto
// backend README "POST /api/v1/legend", legend_reader.py; MIT)
const legendAnswer = (
  assignments: { id: string; label: string; confidence: number }[],
  draftOrder: string[],
  source = 'vlm',
) => ({
  status: 'ok',
  reason: null,
  legend: {
    schema: 'legend-reader/2',
    legend: { found: true, source },
    entries: [],
    assignments: assignments.map((a, i) => ({
      series_id: a.id,
      entry_order: i,
      label: a.label,
      role: 'primary',
      confidence: a.confidence,
    })),
    draft_order: draftOrder,
  },
  elapsed_ms: 5400,
  components: {},
})

const standard = legendAnswer(
  [
    { id: 's2', label: '100 nm', confidence: 0.98 },
    { id: 's0', label: '200 nm', confidence: 0.42 },
    { id: 's1', label: '300 nm', confidence: 0.2 },
  ],
  ['s2', 's0', 's1'],
)

const setup = async (
  legend?: AutoService['legend'],
): Promise<{ ctx: DigitizerContext; service: AutoService }> => {
  const ctx = createDigitizerContext()
  const service: AutoService = {
    capabilities: async () => ['markernet'],
    calibrate: jest.fn(),
    extract: jest.fn(async () => extraction),
  }
  if (legend) service.legend = legend
  await configureAutoService(ctx, service)
  ctx.canvasHandler.setUploadImageUrl(PNG)
  return { ctx, service }
}

const extract = async (ctx: DigitizerContext) => {
  const { result, datasetIds } = await runServerExtraction(ctx, {
    method: 'markernet',
  })
  return { result, method: 'markernet' as const, datasetIds }
}

const snapshot = (ctx: DigitizerContext) => {
  const { timestamp, ...rest } = ctx.projectService.toProjectDTO()
  void timestamp
  return JSON.stringify(rest)
}

const names = (ctx: DigitizerContext) =>
  ctx.datasetRepository.datasets.map((d) => d.name)

describe('legend reading (F9)', () => {
  test('asks with the image and the series in backend pixels', async () => {
    const legend = jest.fn(async () => standard)
    const { ctx } = await setup(legend)
    await readLegendNames(ctx, await extract(ctx))
    expect(legend).toHaveBeenCalledWith(
      {
        image: 'aGVsbG8=',
        series: [
          { id: 's0', kind: 'marker', shape: 'circle', points: [[9.5, 19.5]] },
          { id: 's1', kind: 'marker', shape: 'square', points: [[29.5, 39.5]] },
          {
            id: 's2',
            kind: 'marker',
            shape: 'triangle',
            points: [[49.5, 59.5]],
          },
        ],
      },
      { signal: expect.any(AbortSignal) },
    )
  })

  test('a BarNet extraction is not sent (the reader takes markers and lines only)', async () => {
    const legend = jest.fn(async () => standard)
    const { ctx } = await setup(legend)
    const target = await extract(ctx)
    const outcome = await readLegendNames(ctx, { ...target, method: 'barnet' })
    expect(outcome.status).toBe('unsupported')
    expect(legend).not.toHaveBeenCalled()
  })

  test('>= 0.5 names the draft (auto), 0.3–0.5 suggests, below nothing; legend order', async () => {
    const { ctx } = await setup(async () => standard)
    const target = await extract(ctx)
    expect(names(ctx)).toEqual([
      'circle (markernet)',
      'square (markernet)',
      'triangle (markernet)',
    ])
    const outcome = await readLegendNames(ctx, target)

    expect(outcome.status).toBe('done')
    expect(outcome.named).toEqual([
      { datasetId: 3, label: '100 nm', confidence: 0.98 },
    ])
    expect(outcome.suggestions).toEqual([
      { datasetId: 1, label: '200 nm', confidence: 0.42 },
    ])
    expect(outcome.reordered).toBe(true)
    expect(outcome.changed).toBe(true)
    // INFO: in draft_order; the suggestion does not rename
    expect(names(ctx)).toEqual([
      '100 nm (markernet)',
      'circle (markernet)',
      'square (markernet)',
    ])
    const [first, second, third] = ctx.datasetRepository.datasets
    expect(first.legend).toEqual({
      label: '100 nm',
      confidence: 0.98,
      source: 'vlm',
      status: 'auto',
    })
    expect(second.legend?.status).toBe('suggestion')
    expect(third.legend).toBeUndefined()
    // INFO: the order changed; a new dataset still gets a fresh id
    expect(ctx.datasetRepository.nextDatasetId).toBe(4)
  })

  test('the names, notes and order are ONE undo step', async () => {
    const { ctx } = await setup(async () => standard)
    const target = await extract(ctx)
    const actions: (string | undefined)[] = []
    ctx.historyManager.subscribe((change) => actions.push(change.action))
    await readLegendNames(ctx, target)
    expect(actions).toEqual([LEGEND_ACTION])

    ctx.historyManager.undo()
    expect(names(ctx)).toEqual([
      'circle (markernet)',
      'square (markernet)',
      'triangle (markernet)',
    ])
    expect(ctx.datasetRepository.datasets.every((d) => !d.legend)).toBe(true)
    ctx.historyManager.redo()
    expect(names(ctx)[0]).toBe('100 nm (markernet)')
  })

  test('a name a person changed meanwhile is kept', async () => {
    let answer: (value: unknown) => void = () => undefined
    const { ctx } = await setup(
      () => new Promise((resolve) => (answer = resolve)),
    )
    const target = await extract(ctx)
    const pending = readLegendNames(ctx, target)
    ctx.datasetRepository.datasets[2].name = 'my own name'
    answer(standard)
    const outcome = await pending

    expect(outcome.named).toEqual([])
    expect(outcome.keptNames).toBe(1)
    expect(names(ctx)).toContain('my own name')
    const mine = ctx.datasetRepository.datasets.find(
      (d) => d.name === 'my own name',
    )
    expect(mine?.legend).toBeUndefined()
  })

  test('a draft the legend named is still an untouched draft (re-extract replaces it)', async () => {
    const { ctx } = await setup(async () => standard)
    const target = await extract(ctx)
    await readLegendNames(ctx, target)
    ctx.datasetRepository.datasets.forEach((dataset) =>
      expect(isUntouchedDraft(ctx, dataset, 'markernet')).toBe(true),
    )
    await extract(ctx)
    expect(ctx.datasetRepository.datasets).toHaveLength(3)
    // INFO: re-extracted drafts start over: no legend record of the old ones
    expect(ctx.datasetRepository.datasets.every((d) => !d.legend)).toBe(true)
  })

  test('a clash with another dataset name gets a number', async () => {
    const { ctx } = await setup(async () =>
      legendAnswer(
        [
          { id: 's0', label: 'A', confidence: 0.9 },
          { id: 's1', label: 'A', confidence: 0.9 },
        ],
        ['s0', 's1', 's2'],
      ),
    )
    const target = await extract(ctx)
    await readLegendNames(ctx, target)
    expect(names(ctx)).toEqual([
      'A (markernet)',
      'A (markernet) 2',
      'triangle (markernet)',
    ])
  })

  test.each([
    ['busy', 'the legend reader is busy'],
    ['vlm_unavailable', 'not running'],
    ['timeout', 'did not answer in time'],
  ])('no legend (%s): nothing changes, a short reason', async (status, why) => {
    const { ctx } = await setup(async () => ({
      status,
      reason: 'x',
      legend: null,
      elapsed_ms: 3,
    }))
    const target = await extract(ctx)
    const before = snapshot(ctx)
    const captures = jest.fn()
    ctx.historyManager.subscribe(captures)
    const outcome = await readLegendNames(ctx, target)
    expect(outcome.status).toBe('no_legend')
    expect(outcome.reason).toContain(why)
    expect(captures).not.toHaveBeenCalled()
    expect(snapshot(ctx)).toBe(before)
  })

  test('a source other than the VLM names nothing', async () => {
    const { ctx } = await setup(async () =>
      legendAnswer(
        [{ id: 's0', label: 'ocr', confidence: 0.9 }],
        ['s1', 's0'],
        'ocr',
      ),
    )
    const outcome = await readLegendNames(ctx, await extract(ctx))
    expect(outcome.status).toBe('no_legend')
    expect(names(ctx)[0]).toBe('circle (markernet)')
  })

  test('a failure is quiet: the promise resolves with a reason', async () => {
    const { ctx } = await setup(async () => {
      throw new Error('unreachable')
    })
    const outcome = await readLegendNames(ctx, await extract(ctx))
    expect(outcome.status).toBe('failed')
    expect(outcome.reason).toMatch(/^Legend not read/)
    const odd = await setup(async () => ({ legend: 'what' }))
    const oddOutcome = await readLegendNames(odd.ctx, await extract(odd.ctx))
    expect(oddOutcome.status).toBe('failed')
  })

  test('a service without legend() is not asked', async () => {
    const { ctx } = await setup()
    const outcome = await readLegendNames(ctx, await extract(ctx))
    expect(outcome.status).toBe('unsupported')
  })

  test('an answer for an image that was replaced is dropped', async () => {
    let answer: (value: unknown) => void = () => undefined
    const { ctx } = await setup(
      () => new Promise((resolve) => (answer = resolve)),
    )
    const pending = readLegendNames(ctx, await extract(ctx))
    ctx.canvasHandler.setUploadImageUrl('data:image/png;base64,b3RoZXI=')
    answer(standard)
    expect((await pending).status).toBe('cancelled')
    expect(names(ctx)[0]).toBe('circle (markernet)')
  })

  test('one request at a time: a newer one cancels the older', async () => {
    const signals: AbortSignal[] = []
    const resolvers: ((value: unknown) => void)[] = []
    const { ctx } = await setup(
      (_body, options) =>
        new Promise((resolve) => {
          signals.push(options?.signal as AbortSignal)
          resolvers.push(resolve)
        }),
    )
    const target = await extract(ctx)
    const first = readLegendNames(ctx, target)
    const second = readLegendNames(ctx, target)
    expect(signals[0].aborted).toBe(true)
    resolvers[0](standard)
    resolvers[1](standard)
    expect((await first).status).toBe('cancelled')
    expect((await second).status).toBe('done')
  })

  test('a suggestion can be accepted, as one undo step', async () => {
    const { ctx } = await setup(async () => standard)
    await readLegendNames(ctx, await extract(ctx))
    const actions: (string | undefined)[] = []
    ctx.historyManager.subscribe((change) => actions.push(change.action))

    expect(acceptLegendSuggestion(ctx, 1, 'markernet')).toBe(true)
    expect(actions).toEqual([LEGEND_ACCEPT_ACTION])
    const dataset = ctx.datasetRepository.datasets.find((d) => d.id === 1)
    expect(dataset?.name).toBe('200 nm (markernet)')
    expect(dataset?.legend?.status).toBe('accepted')
    // INFO: nothing left to accept
    expect(acceptLegendSuggestion(ctx, 1, 'markernet')).toBe(false)
    expect(acceptLegendSuggestion(ctx, 2, 'markernet')).toBe(false)

    ctx.historyManager.undo()
    const back = ctx.datasetRepository.datasets.find((d) => d.id === 1)
    expect(back?.name).toBe('circle (markernet)')
    expect(back?.legend?.status).toBe('suggestion')
  })
})

describe('base64OfDataUrl', () => {
  test('takes the base64 part, or encodes a plain one as UTF-8', () => {
    expect(base64OfDataUrl(PNG)).toBe('aGVsbG8=')
    expect(base64OfDataUrl('data:image/svg+xml,%3Csvg%3E')).toBe(btoa('<svg>'))
    expect(base64OfDataUrl('data:text/plain,%C3%A9')).toBe(btoa('Ã©'))
    expect(base64OfDataUrl('blob:x')).toBeNull()
  })
})
