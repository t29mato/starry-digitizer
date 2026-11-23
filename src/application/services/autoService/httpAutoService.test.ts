import {
  createHttpAutoService,
  isBlockedAsMixedContent,
} from './httpAutoService'
import { DigitizerError } from '@/application/errors'

type FetchCall = [string, RequestInit]

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

describe('createHttpAutoService', () => {
  test('asks {baseUrl}/capabilities and keeps only string features', async () => {
    const fetch = jest.fn(async () =>
      jsonResponse(200, { features: ['auto_axis', 3, 'markernet'] }),
    )
    const service = createHttpAutoService({
      baseUrl: '/api/v4/digitizer-auto/',
      fetch: fetch as unknown as typeof globalThis.fetch,
      headers: () => ({ 'X-CSRFToken': 't' }),
    })
    await expect(service.capabilities()).resolves.toEqual([
      'auto_axis',
      'markernet',
    ])
    const [url, init] = fetch.mock.calls[0] as unknown as FetchCall
    expect(url).toBe('/api/v4/digitizer-auto/capabilities')
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': 't' },
    })
  })

  test('host-given features skip the request', async () => {
    const fetch = jest.fn()
    const service = createHttpAutoService({
      baseUrl: '/x',
      features: ['lineformer'],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await expect(service.capabilities()).resolves.toEqual(['lineformer'])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('posts the image bytes (not multipart) and builds the extract query', async () => {
    const fetch = jest.fn(async () => jsonResponse(200, { series: [] }))
    const service = createHttpAutoService({
      baseUrl: 'http://backend.example/wpd-auto/api/v1',
      capabilitiesUrl: '/elsewhere',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const image = new Blob(['png'], { type: 'image/png' })
    await service.extract(image, {
      method: 'markernet',
      area: { x0: 79.5, y0: 29.5, x1: 609.5, y1: 419.5 },
      params: { threshold: 0.30000000000000004 },
    })
    const [url, init] = fetch.mock.calls[0] as unknown as FetchCall
    expect(url).toBe(
      'http://backend.example/wpd-auto/api/v1/extract?method=markernet&area=79.5%2C29.5%2C609.5%2C419.5&threshold=0.3',
    )
    expect(init.method).toBe('POST')
    expect(init.body).toBe(image)
    expect(init.headers).toMatchObject({ 'Content-Type': 'image/png' })

    await service.calibrate(image)
    expect((fetch.mock.calls[1] as unknown as FetchCall)[0]).toBe(
      'http://backend.example/wpd-auto/api/v1/calibrate',
    )
  })

  test('HTTP errors carry the backend code in an AUTO_SERVICE_FAILED error', async () => {
    const fetch = jest.fn(async () =>
      jsonResponse(503, {
        error: 'method_unavailable',
        reason: 'service_unavailable',
      }),
    )
    const service = createHttpAutoService({
      baseUrl: '/x',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const failure = service.extract(new Blob(['x']), { method: 'lineformer' })
    await expect(failure).rejects.toBeInstanceOf(DigitizerError)
    await expect(failure).rejects.toMatchObject({
      code: 'AUTO_SERVICE_FAILED',
      message: expect.stringContaining(
        'method_unavailable: service_unavailable',
      ),
    })
  })

  test('a request that never answers is aborted after the timeout', async () => {
    jest.useFakeTimers()
    try {
      const fetch = jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            )
          }),
      )
      const service = createHttpAutoService({
        baseUrl: '/x',
        requestTimeoutMs: 1000,
        fetch: fetch as unknown as typeof globalThis.fetch,
      })
      const failure = service.calibrate(new Blob(['x']))
      jest.advanceTimersByTime(1000)
      await expect(failure).rejects.toMatchObject({
        code: 'AUTO_SERVICE_FAILED',
        message: expect.stringContaining('did not answer'),
      })
    } finally {
      jest.useRealTimers()
    }
  })

  test("the caller's signal aborts the fetch", async () => {
    const fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          )
        }),
    )
    const service = createHttpAutoService({
      baseUrl: '/x',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const controller = new AbortController()
    const failure = service.extract(
      new Blob(['x']),
      { method: 'markernet' },
      { signal: controller.signal },
    )
    controller.abort()
    await expect(failure).rejects.toMatchObject({
      code: 'AUTO_SERVICE_FAILED',
      message: expect.stringContaining('cancelled'),
    })
  })

  test('legend / series_threshold / loops go into the extract query as given', async () => {
    const fetch = jest.fn(async () => jsonResponse(200, { series: [] }))
    const service = createHttpAutoService({
      baseUrl: '/x',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await service.extract(new Blob(['x']), {
      method: 'markernet',
      params: { threshold: 0.4, series_threshold: 0.8, legend: 0 },
    })
    await service.extract(new Blob(['x']), {
      method: 'lineformer',
      params: { threshold: 0.3, interval: 10, loops: 1 },
    })
    expect((fetch.mock.calls[0] as unknown as FetchCall)[0]).toBe(
      '/x/extract?method=markernet&threshold=0.4&series_threshold=0.8&legend=0',
    )
    expect((fetch.mock.calls[1] as unknown as FetchCall)[0]).toBe(
      '/x/extract?method=lineformer&threshold=0.3&interval=10&loops=1',
    )
  })
})

describe('createHttpAutoService retries', () => {
  const withHeaders = (
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ) =>
    ({
      ...jsonResponse(status, body),
      headers: { get: (name: string) => headers[name] ?? null },
    }) as unknown as Response

  const setup = (
    responses: Array<Response | Error>,
    retryBudgetMs?: number,
  ) => {
    const fetch = jest.fn(async () => {
      const next = responses.shift()
      if (next instanceof Error) throw next
      return next as Response
    })
    const sleep = jest.fn(async () => undefined)
    const service = createHttpAutoService({
      baseUrl: '/x',
      fetch: fetch as unknown as typeof globalThis.fetch,
      sleep,
      retryBudgetMs,
    })
    return { fetch, sleep, service }
  }

  test('a restarting backend (502, unreachable, 504) is asked again with growing waits', async () => {
    const { fetch, sleep, service } = setup([
      withHeaders(502, null),
      new TypeError('Failed to fetch'),
      withHeaders(504, null),
      withHeaders(200, { frames: [] }),
    ])
    await expect(service.calibrate(new Blob(['x']))).resolves.toEqual({
      frames: [],
    })
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      1000, 2000, 4000,
    ])
  })

  test('busy waits as long as Retry-After says', async () => {
    const { sleep, service } = setup([
      withHeaders(503, { error: 'busy' }, { 'Retry-After': '5' }),
      withHeaders(200, { series: [] }),
    ])
    await service.extract(new Blob(['x']), { method: 'markernet' })
    expect((sleep.mock.calls[0] as unknown[])[0]).toBe(5000)
  })

  test('a 503 that waiting will not fix is not retried', async () => {
    const { fetch, service } = setup([
      withHeaders(503, {
        error: 'method_unavailable',
        reason: 'service_unavailable',
      }),
    ])
    await expect(
      service.extract(new Blob(['x']), { method: 'lineformer' }),
    ).rejects.toThrow(/method_unavailable: service_unavailable/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('4xx is not retried', async () => {
    const { fetch, service } = setup([
      withHeaders(415, { error: 'unsupported' }),
    ])
    await expect(service.calibrate(new Blob(['x']))).rejects.toThrow(/HTTP 415/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('gives up once the budget is spent and reports the last answer', async () => {
    const { fetch, sleep, service } = setup(
      [withHeaders(502, null), withHeaders(502, null), withHeaders(502, null)],
      3000,
    )
    await expect(service.calibrate(new Blob(['x']))).rejects.toThrow(/HTTP 502/)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([
      1000, 2000,
    ])
  })

  test('budget 0 = no retry', async () => {
    const { fetch, service } = setup([new TypeError('Failed to fetch')], 0)
    await expect(service.calibrate(new Blob(['x']))).rejects.toThrow(
      /could not be reached/,
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('a cancel while waiting stops the retries', async () => {
    const controller = new AbortController()
    const fetch = jest.fn(async () => withHeaders(502, null))
    const service = createHttpAutoService({
      baseUrl: '/x',
      fetch: fetch as unknown as typeof globalThis.fetch,
      sleep: async () => controller.abort(),
    })
    await expect(
      service.calibrate(new Blob(['x']), { signal: controller.signal }),
    ).rejects.toThrow(/cancelled/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('createHttpAutoService methods / status', () => {
  test('GET {baseUrl}/extract/methods and {baseUrl}/auto/status', async () => {
    const fetch = jest.fn(async () => jsonResponse(200, { methods: [] }))
    const service = createHttpAutoService({
      baseUrl: '/wpd-auto/api/v1/',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await expect(service.methods?.()).resolves.toEqual({ methods: [] })
    await service.status?.()
    const urls = fetch.mock.calls.map((c) => (c as unknown as FetchCall)[0])
    expect(urls).toEqual([
      '/wpd-auto/api/v1/extract/methods',
      '/wpd-auto/api/v1/auto/status',
    ])
    expect((fetch.mock.calls[0] as unknown as FetchCall)[1].method).toBe('GET')
  })
})

describe('createHttpAutoService components', () => {
  test('GET {baseUrl}/components with the configured headers', async () => {
    const fetch = jest.fn(async () => jsonResponse(200, { components: [] }))
    const service = createHttpAutoService({
      baseUrl: '/wpd-auto/api/v1',
      headers: { 'X-WPD-App': 'starry-digitizer' },
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await expect(service.components?.()).resolves.toEqual({ components: [] })
    const [url, init] = fetch.mock.calls[0] as unknown as FetchCall
    expect(url).toBe('/wpd-auto/api/v1/components')
    expect(init.method).toBe('GET')
    expect((init.headers as Record<string, string>)['X-WPD-App']).toBe(
      'starry-digitizer',
    )
  })

  test('an HTTP error rejects with AUTO_SERVICE_FAILED', async () => {
    const fetch = jest.fn(async () => jsonResponse(404, { error: 'not_found' }))
    const service = createHttpAutoService({
      baseUrl: '/api',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await expect(service.components?.()).rejects.toMatchObject({
      code: 'AUTO_SERVICE_FAILED',
    })
  })
})

describe('isBlockedAsMixedContent', () => {
  test('only an http target from an https page is blocked', () => {
    expect(
      isBlockedAsMixedContent(
        'http://starryai.example/x',
        'https://v4.example/',
      ),
    ).toBe(true)
    expect(isBlockedAsMixedContent('/relay', 'https://v4.example/')).toBe(false)
    expect(
      isBlockedAsMixedContent('http://starryai.example/x', 'http://localhost/'),
    ).toBe(false)
  })
})
