import {
  CollectClient,
  CollectClientOptions,
  KEEPALIVE_BYTES,
  MAX_QUEUED_EVENTS,
  utf8Length,
} from './collectClient'
import { KeyValueStorage } from './collectStorage'
import { sha256Hex } from './sha256'

// INFO: a fake backend (the /collect/* answers of wpd-auto's collect.py) and
// hand-run timers, so every gate and retry is stepped through explicitly

type Call = {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
  keepalive: boolean
}

function jsonResponse(status: number, body: unknown, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers)),
    json: async () => body,
  } as unknown as Response
}

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

const brokenStorage: KeyValueStorage = {
  getItem() {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
}

function setup(
  options: {
    status?: unknown
    users?: unknown
    eventStatus?: number[]
    storage?: KeyValueStorage | null
    existing?: string[]
  } = {},
) {
  const calls: Call[] = []
  const eventStatus = [...(options.eventStatus ?? [])]
  const timers: { fn: () => void; ms: number }[] = []
  let id = 0
  const fetchFn = jest.fn(async (url: string, init: RequestInit) => {
    const call: Call = {
      method: init.method ?? 'GET',
      url,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
      keepalive: Boolean(init.keepalive),
    }
    calls.push(call)
    if (url.endsWith('/collect/status')) {
      return jsonResponse(
        200,
        options.status ?? {
          enabled: true,
          environment: 'staging',
          max_image_bytes: 100,
          max_json_bytes: 5242880,
        },
      )
    }
    if (url.endsWith('/collect/users')) {
      return jsonResponse(
        200,
        options.users ?? { enabled: false, guest: true, users: [] },
      )
    }
    if (url.endsWith('/collect/events')) {
      const status = eventStatus.shift() ?? 200
      if (status === -1) throw new TypeError('Failed to fetch')
      return jsonResponse(
        status,
        {},
        status === 429 ? { 'Retry-After': '30' } : {},
      )
    }
    if (url.includes('/collect/images/')) {
      if (call.method === 'GET') {
        const sha = url.split('/').pop()
        return jsonResponse(200, {
          exists: (options.existing ?? []).includes(sha ?? ''),
        })
      }
      return jsonResponse(200, { stored: true, new: true })
    }
    return jsonResponse(404, {})
  })
  const warn = jest.fn()
  const opts: CollectClientOptions = {
    baseUrl: '/wpd-auto-staging/api/v1/',
    app: { commit: 'abc1234', version: '2.0.0', build: 7 },
    fetch: fetchFn as unknown as typeof fetch,
    storage: options.storage === undefined ? memoryStorage() : options.storage,
    now: () => 1000,
    makeId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    setTimer: (fn, ms) => {
      const timer = { fn, ms }
      timers.push(timer)
      return timer
    },
    clearTimer: (timer) => {
      const i = timers.indexOf(timer as { fn: () => void; ms: number })
      if (i >= 0) timers.splice(i, 1)
    },
    warn,
  }
  const client = new CollectClient(opts)
  // INFO: run the earliest timer, then let its promises settle
  const runTimer = async () => {
    const timer = timers.shift()
    timer?.fn()
    await settle()
    return timer
  }
  const eventCalls = () =>
    calls.filter((c) => c.url.endsWith('/collect/events'))
  return { client, calls, timers, runTimer, eventCalls, warn, fetchFn }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CollectClient', () => {
  it('sends nothing at all when the server does not collect', async () => {
    const { client, calls, timers } = setup({ status: { enabled: false } })
    client.record('session.start', { a: 1 })
    expect(await client.start()).toBe('off')
    client.markNoticeShown()
    client.record('edit', { action: 'point.add' })
    expect(client.pending).toBe(0)
    expect(timers).toHaveLength(0)
    expect(calls.map((c) => c.url)).toEqual([
      '/wpd-auto-staging/api/v1/collect/status',
    ])
    expect(client.headers()).toEqual({ 'X-WPD-App': 'starry-digitizer' })
  })

  it('is off when the status request fails', async () => {
    const { client, fetchFn } = setup()
    fetchFn.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await client.start()).toBe('off')
  })

  it('holds events until the notice was shown, then batches them', async () => {
    const { client, eventCalls, runTimer, timers } = setup()
    client.record('session.start', { path: '/' })
    await client.start()
    client.record('edit', { action: 'point.add' })
    expect(timers).toHaveLength(0)
    expect(client.headers()).toEqual({ 'X-WPD-App': 'starry-digitizer' })

    client.markNoticeShown()
    expect(timers.map((t) => t.ms)).toEqual([4000])
    await runTimer()
    expect(eventCalls()).toHaveLength(1)
    const [call] = eventCalls()
    expect(call.body).toEqual({
      client_id: '00000000-0000-4000-8000-000000000002',
      session_id: '00000000-0000-4000-8000-000000000001',
      app_commit: 'abc1234',
      app_version: '2.0.0',
      app_build: 7,
      events: [
        { type: 'session.start', t: 1000, seq: 1, data: { path: '/' } },
        { type: 'edit', t: 1000, seq: 2, data: { action: 'point.add' } },
      ],
    })
    expect(call.headers).toEqual({
      'X-WPD-App': 'starry-digitizer',
      'X-WPD-Client-Id': '00000000-0000-4000-8000-000000000002',
      'X-WPD-Session-Id': '00000000-0000-4000-8000-000000000001',
      'Content-Type': 'application/json',
    })
    expect(client.pending).toBe(0)
  })

  it('keeps the client id per environment, namespaced apart from wpd-auto', async () => {
    const storage = memoryStorage()
    storage.data.set('wpd-auto-client-id', 'not-ours')
    const first = setup({ storage })
    await first.client.start()
    expect([...storage.data.keys()]).toContain(
      'starry-digitizer.staging.client-id',
    )
    const second = setup({ storage })
    await second.client.start()
    expect(second.client.clientId).toBe(first.client.clientId)
    expect(second.client.sessionId).not.toBe(second.client.clientId)
    expect(storage.data.get('wpd-auto-client-id')).toBe('not-ours')
  })

  it('still works when storage throws (a fresh id per page)', async () => {
    const { client, eventCalls, runTimer } = setup({ storage: brokenStorage })
    await client.start()
    client.markNoticeShown()
    client.record('edit', {})
    await runTimer()
    expect(eventCalls()).toHaveLength(1)
    expect(client.clientId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('retries with growing waits and keeps the order', async () => {
    const { client, eventCalls, runTimer, timers } = setup({
      eventStatus: [503, -1, 200],
    })
    await client.start()
    client.markNoticeShown()
    client.record('a', {})
    await runTimer()
    expect(timers.map((t) => t.ms)).toEqual([2000])
    client.record('b', {})
    // INFO: no batch timer while a retry is waiting
    expect(timers.map((t) => t.ms)).toEqual([2000])
    await runTimer()
    expect(timers.map((t) => t.ms)).toEqual([4000])
    await runTimer()
    expect(eventCalls()).toHaveLength(3)
    const last = eventCalls()[2].body as { events: { type: string }[] }
    expect(last.events.map((e) => e.type)).toEqual(['a', 'b'])
    expect(client.pending).toBe(0)
  })

  describe('flushNow (before a reload)', () => {
    it('sends at once, without the batch delay', async () => {
      const { client, eventCalls, timers } = setup()
      await client.start()
      client.markNoticeShown()
      client.record('a', {})
      client.record('b', {})
      expect(await client.flushNow()).toBe(true)
      expect(timers).toHaveLength(0)
      expect(eventCalls()).toHaveLength(1)
      expect(client.pending).toBe(0)
    })

    it('tries once more while a retry waits; false when that fails too', async () => {
      const { client, eventCalls, runTimer, timers } = setup({
        eventStatus: [503, 503, 200],
      })
      await client.start()
      client.markNoticeShown()
      client.record('a', {})
      await runTimer()
      expect(timers.map((t) => t.ms)).toEqual([2000])
      expect(await client.flushNow()).toBe(false)
      expect(eventCalls()).toHaveLength(2)
      expect(timers.map((t) => t.ms)).toEqual([4000])
      expect(await client.flushNow()).toBe(true)
      expect(client.pending).toBe(0)
    })

    it('waits for a flush in progress and sends what came after', async () => {
      const { client, eventCalls, timers } = setup()
      await client.start()
      client.markNoticeShown()
      client.record('a', {})
      const running = client.flush()
      client.record('b', {})
      expect(await client.flushNow()).toBe(true)
      await running
      expect(eventCalls()).toHaveLength(2)
      expect(timers).toHaveLength(0)
    })

    it('is false before the notice was shown (nothing may leave)', async () => {
      const { client, eventCalls } = setup()
      await client.start()
      client.record('a', {})
      expect(await client.flushNow()).toBe(false)
      expect(eventCalls()).toHaveLength(0)
    })
  })

  it('waits at least Retry-After on 429', async () => {
    const { client, runTimer, timers } = setup({ eventStatus: [429] })
    await client.start()
    client.markNoticeShown()
    client.record('a', {})
    await runTimer()
    expect(timers.map((t) => t.ms)).toEqual([30000])
  })

  it('drops a batch the server refuses (400) and warns once', async () => {
    const { client, runTimer, warn } = setup({ eventStatus: [400, 400] })
    await client.start()
    client.markNoticeShown()
    client.record('a', {})
    await runTimer()
    client.record('b', {})
    await runTimer()
    expect(client.pending).toBe(0)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('refuses bad type names locally', async () => {
    const { client } = setup()
    client.record('server.calibrate', {})
    client.record('Bad Type', {})
    expect(client.pending).toBe(0)
  })

  it('splits batches at 500 events', async () => {
    const { client, eventCalls, runTimer } = setup()
    await client.start()
    for (let i = 0; i < 1200; i++) client.record('a', { i })
    client.markNoticeShown()
    await runTimer()
    expect(
      eventCalls().map((c) => (c.body as { events: unknown[] }).events.length),
    ).toEqual([500, 500, 200])
  })

  it('keeps at most MAX_QUEUED_EVENTS, dropping the oldest', async () => {
    const { client } = setup()
    for (let i = 0; i < MAX_QUEUED_EVENTS + 5; i++) client.record('a', { i })
    expect(client.pending).toBe(MAX_QUEUED_EVENTS)
  })

  describe('names', () => {
    const users = {
      enabled: true,
      guest: true,
      users: [
        { id: 'alice', name: 'Alice Example' },
        { id: 'bob', name: 'Bob' },
      ],
    }

    it('asks, holds events until chosen, then sends them under the name', async () => {
      const storage = memoryStorage()
      const { client, eventCalls, runTimer, timers } = setup({ users, storage })
      client.record('session.start', {})
      await client.start()
      client.markNoticeShown()
      expect(client.needsUserChoice).toBe(true)
      await runTimer()
      expect(eventCalls()).toHaveLength(0)

      client.chooseUser('alice')
      expect(timers.map((t) => t.ms)).toEqual([0])
      await runTimer()
      expect(eventCalls()).toHaveLength(1)
      expect(eventCalls()[0].headers['X-WPD-User']).toBe('alice')
      expect(storage.data.get('starry-digitizer.staging.user')).toBe(
        '{"user":"alice"}',
      )
      expect(client.userName).toBe('Alice Example')
      expect(client.headers()['X-WPD-User']).toBe('alice')
    })

    it('does not ask again when a listed name was kept', async () => {
      const storage = memoryStorage()
      storage.data.set('starry-digitizer.staging.user', '{"user":"bob"}')
      const { client } = setup({ users, storage })
      await client.start()
      expect(client.needsUserChoice).toBe(false)
      expect(client.user).toBe('bob')
    })

    it('asks again when the kept name is no longer listed', async () => {
      const storage = memoryStorage()
      storage.data.set('starry-digitizer.staging.user', '{"user":"carol"}')
      const { client } = setup({ users, storage })
      await client.start()
      expect(client.needsUserChoice).toBe(true)
    })

    it('Guest sends no X-WPD-User; Guest cannot be chosen when switched off', async () => {
      const { client } = setup({ users })
      await client.start()
      client.markNoticeShown()
      client.chooseUser(null)
      expect(client.headers()['X-WPD-User']).toBeUndefined()

      const strict = setup({ users: { ...users, guest: false } })
      await strict.client.start()
      strict.client.chooseUser(null)
      expect(strict.client.needsUserChoice).toBe(true)
    })

    it('a change keeps earlier events under the earlier name', async () => {
      const { client, eventCalls, runTimer } = setup({ users })
      await client.start()
      client.markNoticeShown()
      client.chooseUser('alice')
      client.record('a', {})
      client.chooseUser('bob')
      client.record('b', {})
      await runTimer()
      expect(
        eventCalls().map((c) => [
          c.headers['X-WPD-User'],
          (c.body as { events: { type: string }[] }).events.map((e) => e.type),
        ]),
      ).toEqual([
        ['alice', ['a']],
        ['bob', ['user.changed', 'b']],
      ])
    })

    it('sends what is left as Guest when the page is hidden before a choice', async () => {
      const { client, eventCalls } = setup({ users })
      client.record('session.start', {})
      await client.start()
      client.markNoticeShown()
      client.flushOnHide()
      await settle()
      expect(eventCalls()).toHaveLength(1)
      expect(eventCalls()[0].keepalive).toBe(true)
      expect(eventCalls()[0].headers['X-WPD-User']).toBeUndefined()
    })
  })

  it('flushOnHide sends with keepalive within the byte budget', async () => {
    const { client, eventCalls, timers } = setup()
    await client.start()
    client.markNoticeShown()
    const big = 'x'.repeat(20000)
    for (let i = 0; i < 5; i++) client.record('a', { big })
    client.flushOnHide()
    await settle()
    expect(timers).toHaveLength(0)
    const [call] = eventCalls()
    expect(call.keepalive).toBe(true)
    expect(utf8Length(JSON.stringify(call.body))).toBeLessThanOrEqual(
      KEEPALIVE_BYTES,
    )
    expect((call.body as { events: unknown[] }).events).toHaveLength(2)
    expect(client.pending).toBe(3)
  })

  describe('images', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4])
    const sha = sha256Hex(bytes)

    it('records the image and uploads it once (GET, then PUT)', async () => {
      const { client, calls } = setup()
      await client.start()
      expect(client.addImage(bytes, { type: 'image/png', name: 'a.png' })).toBe(
        sha,
      )
      client.addImage(bytes, { type: 'image/png' })
      await settle()
      // INFO: nothing before the notice
      expect(calls.filter((c) => c.url.includes('/images/'))).toHaveLength(0)
      client.markNoticeShown()
      await settle()
      await settle()
      const imageCalls = calls.filter((c) => c.url.includes('/images/'))
      expect(imageCalls.map((c) => c.method)).toEqual(['GET', 'PUT'])
      expect(imageCalls[1].url).toBe(
        `/wpd-auto-staging/api/v1/collect/images/${sha}?client_id=00000000-0000-4000-8000-000000000002&session_id=00000000-0000-4000-8000-000000000001`,
      )
      expect(imageCalls[1].headers['Content-Type']).toBe('image/png')
      expect(imageCalls[1].body).toBe(bytes)
      expect(client.pendingImages).toBe(0)
      expect(client.pending).toBe(1)
    })

    it('skips the PUT when the server has it', async () => {
      const { client, calls } = setup({ existing: [sha] })
      await client.start()
      client.markNoticeShown()
      client.addImage(bytes, { type: 'image/png' })
      await settle()
      expect(
        calls.filter((c) => c.url.includes('/images/')).map((c) => c.method),
      ).toEqual(['GET'])
    })

    it('does not upload above max_image_bytes; records image.not_sent', async () => {
      const { client, calls, runTimer, eventCalls } = setup()
      await client.start()
      client.markNoticeShown()
      client.addImage(new Uint8Array(101), { type: 'image/png' })
      await runTimer()
      expect(calls.filter((c) => c.url.includes('/images/'))).toHaveLength(0)
      const types = (
        eventCalls()[0].body as { events: { type: string }[] }
      ).events.map((e) => e.type)
      expect(types).toEqual(['image', 'image.not_sent'])
    })
  })
})
