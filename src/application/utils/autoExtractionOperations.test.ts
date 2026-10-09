import {
  buildEditLog,
  currentReviewDiff,
  hasAutoExtractionUrlParam,
  installAutoExtractionMessageBridge,
  loadAutoExtraction,
  loadAutoExtractionFromUrlParam,
  MESSAGE_TYPE,
} from './autoExtractionOperations'
import {
  historyManager,
  reviewSession,
} from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'

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
  beforeEach(() => {
    reviewSession.clear()
  })

  test('loadAutoExtraction replaces the state and starts a review', async () => {
    datasetRepository.activeDataset.addPoint(1, 1)
    historyManager.capture()

    const result = await loadAutoExtraction(JSON.stringify(doc))

    expect(result).toEqual({
      series: 2,
      points: 3,
      calibration: expect.objectContaining({ x: expect.any(Object) }),
      warnings: [],
    })
    expect(axisSetRepository.axisSets).toHaveLength(1)
    expect(datasetRepository.datasets.map((d) => d.name)).toEqual(['A', 'B'])
    expect(datasetRepository.activeDatasetId).toBe(1)
    expect(datasetRepository.datasets[1].points[0]).toMatchObject({
      xPx: 200,
      yPx: 300,
    })
    expect(historyManager.canUndo).toBe(false)
    expect(reviewSession.isActive).toBe(true)
    expect(reviewSession.data?.source).toEqual(doc.source)
  })

  test('edits are recorded as events and show up in the edit log', async () => {
    await loadAutoExtraction(doc)

    historyManager.capture('point.delete')
    datasetRepository.datasets[0].clearPoint(2)
    historyManager.capture('point.add')
    datasetRepository.datasets[0].addPoint(10, 10)

    expect(currentReviewDiff()?.summary.points).toMatchObject({
      deleted: 1,
      added: 1,
    })
    const log = buildEditLog()
    expect(log?.events.map((e) => e.action)).toEqual([
      'point.delete',
      'point.add',
    ])
    expect(log?.summary.points).toMatchObject({ deleted: 1, added: 1, kept: 2 })
    expect(log?.final.series[0].origins).toEqual([[0, 0], null])

    // INFO: undo is diffed too — the deletion and the addition vanish
    historyManager.undo()
    historyManager.undo()
    expect(buildEditLog()?.summary.points).toMatchObject({
      deleted: 0,
      added: 0,
      kept: 3,
    })
    expect(buildEditLog()?.summary.events).toEqual({
      total: 4,
      undo: 2,
      redo: 0,
    })
  })

  test('a document without series still leaves one dataset to work in', async () => {
    await loadAutoExtraction({ version: 1, series: [] })
    expect(datasetRepository.datasets).toHaveLength(1)
    expect(datasetRepository.activeDataset.points).toEqual([])
  })

  test('invalid documents throw and leave the review untouched', async () => {
    await expect(loadAutoExtraction({ version: 2, series: [] })).rejects.toThrow(
      'version must be 1',
    )
    expect(reviewSession.isActive).toBe(false)
    expect(buildEditLog()).toBeNull()
  })
})

describe('loadAutoExtractionFromUrlParam', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  test('no parameter: nothing to do', async () => {
    expect(hasAutoExtractionUrlParam('https://a.example/')).toBe(false)
    expect(
      await loadAutoExtractionFromUrlParam('https://a.example/'),
    ).toBeNull()
  })

  test('fetches the JSON relative to the page URL and loads it', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ version: 1, series: [{ points_px: [[1, 2]] }] }),
    }))
    global.fetch = fetchMock as unknown as typeof fetch

    const href = 'https://a.example/app/?extraction=runs/1/doc.json'
    expect(hasAutoExtractionUrlParam(href)).toBe(true)
    const result = await loadAutoExtractionFromUrlParam(href)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://a.example/app/runs/1/doc.json',
    )
    expect(result).toMatchObject({ success: true, result: { points: 1 } })
  })

  test('reports HTTP errors and non-http schemes', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
    })) as unknown as typeof fetch
    expect(
      await loadAutoExtractionFromUrlParam('https://a.example/?extraction=x'),
    ).toMatchObject({ success: false, errorMessage: expect.stringContaining('404') })
    expect(
      await loadAutoExtractionFromUrlParam(
        'https://a.example/?extraction=javascript:alert(1)',
      ),
    ).toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('unsupported URL scheme'),
    })
  })
})

describe('installAutoExtractionMessageBridge', () => {
  type Listener = (event: MessageEvent) => Promise<void>

  const setup = () => {
    const opener = { postMessage: jest.fn() }
    const stranger = { postMessage: jest.fn() }
    let listener: Listener | null = null
    const win = {
      opener,
      parent: null as unknown,
      addEventListener: jest.fn((_: string, l: Listener) => (listener = l)),
      removeEventListener: jest.fn(),
    }
    win.parent = win
    const onLoaded = jest.fn()
    const remove = installAutoExtractionMessageBridge(
      win as unknown as Window,
      onLoaded,
    )
    const send = (source: unknown, data: unknown, origin = 'https://p.example') =>
      (listener as Listener)({ source, data, origin } as MessageEvent)
    return { opener, stranger, win, onLoaded, remove, send }
  }

  test('announces readiness to the opener', () => {
    const { opener } = setup()
    expect(opener.postMessage).toHaveBeenCalledWith(
      { type: MESSAGE_TYPE.READY },
      '*',
    )
  })

  test('loads documents from the opener and replies to its origin', async () => {
    const { opener, onLoaded, send } = setup()
    await send(opener, {
      type: MESSAGE_TYPE.LOAD,
      document: { version: 1, series: [{ points_px: [[1, 2]] }] },
    })
    expect(onLoaded).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    )
    expect(opener.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: MESSAGE_TYPE.LOAD_RESULT, ok: true }),
      'https://p.example',
    )

    await send(opener, { type: MESSAGE_TYPE.GET_EDIT_LOG }, 'null')
    expect(opener.postMessage).toHaveBeenLastCalledWith(
      {
        type: MESSAGE_TYPE.EDIT_LOG,
        editLog: expect.objectContaining({ format: 'starry-digitizer/edit-log' }),
      },
      '*',
    )
  })

  test('reports load errors back', async () => {
    const { opener, send } = setup()
    await send(opener, { type: MESSAGE_TYPE.LOAD, document: {} })
    expect(opener.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, error: expect.any(String) }),
      'https://p.example',
    )
  })

  test('ignores other windows and non-object messages; can be removed', async () => {
    const { opener, stranger, onLoaded, send, remove, win } = setup()
    await send(stranger, { type: MESSAGE_TYPE.LOAD, document: {} })
    await send(opener, 'hello')
    await send(opener, { type: 'other' })
    expect(onLoaded).not.toHaveBeenCalled()
    expect(stranger.postMessage).not.toHaveBeenCalled()
    remove()
    expect(win.removeEventListener).toHaveBeenCalled()
  })
})
