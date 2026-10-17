import {
  hasAutoExtractionUrlParam,
  installAutoExtractionMessageBridge,
  loadAutoExtractionFromUrlParam,
  MESSAGE_TYPE,
} from './autoExtractionBridge'
import { createDigitizerContext } from '@/application/digitizerContext'

describe('loadAutoExtractionFromUrlParam', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  test('no parameter: nothing to do', async () => {
    expect(hasAutoExtractionUrlParam('https://a.example/')).toBe(false)
    expect(
      await loadAutoExtractionFromUrlParam(createDigitizerContext(), 'https://a.example/'),
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
    const result = await loadAutoExtractionFromUrlParam(
      createDigitizerContext(),
      href,
    )

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
      await loadAutoExtractionFromUrlParam(createDigitizerContext(), 'https://a.example/?extraction=x'),
    ).toMatchObject({ success: false, errorMessage: expect.stringContaining('404') })
    expect(
      await loadAutoExtractionFromUrlParam(createDigitizerContext(), 
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
      createDigitizerContext(),
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
