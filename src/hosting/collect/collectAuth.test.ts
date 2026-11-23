import { createDigitizerContext } from '@/application/digitizerContext'
import { AuthSession, AuthStorage, TOKEN_HEADER } from './auth'
import { CollectView, startCollect } from './collectApp'
import { CollectClient } from './collectClient'

// INFO: the research collection with passwords (DRAFT auth API, wpd-auto
// feat/user-passwords docs/user-passwords.md): which token each request
// carries, and that a refused token holds the events instead of losing them

const FUTURE = '2099-01-01T00:00:00Z'
const KEY = 'starrydata-auth--staging'

type Call = { method: string; url: string; headers: Record<string, string> }

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(),
    json: async () => body,
    clone() {
      return this
    },
  } as unknown as Response
}

function memoryStorage(): AuthStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(
  options: {
    login?: 'password' | 'label'
    guest?: boolean
    kept?: { token: string; id: string }
    users?: { id: string; name: string }[]
  } = {},
) {
  const calls: Call[] = []
  // INFO: the server's tokens; a token not in here is refused (401)
  const valid = new Map<string, string>()
  let issued = 0
  const storage = memoryStorage()
  if (options.kept) {
    valid.set(options.kept.token, options.kept.id)
    storage.setItem(
      KEY,
      JSON.stringify({
        token: options.kept.token,
        user: { id: options.kept.id, name: options.kept.id },
        expires_at: FUTURE,
      }),
    )
  }
  const fetchFn = jest.fn(async (url: string, init: RequestInit = {}) => {
    const headers = { ...((init.headers ?? {}) as Record<string, string>) }
    calls.push({ method: init.method ?? 'GET', url, headers })
    const token = headers[TOKEN_HEADER]
    const path = url.replace(/^\/api/, '').split('?')[0]
    if (path === '/auth/status')
      return jsonResponse(200, {
        login: options.login ?? 'password',
        guest: options.guest ?? true,
      })
    if (path === '/auth/login') {
      const body = JSON.parse(init.body as string)
      if (body.password !== 'right')
        return jsonResponse(401, { error: 'invalid_login' })
      const t = `tok-${++issued}`
      valid.set(t, body.user)
      return jsonResponse(200, {
        token: t,
        user: { id: body.user, name: body.user.toUpperCase() },
        expires_at: FUTURE,
      })
    }
    if (path === '/auth/logout') {
      if (token) valid.delete(token)
      return jsonResponse(204, null)
    }
    if (token && !valid.has(token) && options.login !== 'label')
      return jsonResponse(401, { error: 'invalid_token' })
    if (path === '/auth/me')
      return token
        ? jsonResponse(200, {
            user: { id: valid.get(token), name: valid.get(token) },
            expires_at: FUTURE,
          })
        : jsonResponse(401, { error: 'invalid_token' })
    if (path === '/collect/status')
      return jsonResponse(200, { enabled: true, environment: 'staging' })
    if (path === '/collect/users')
      return jsonResponse(200, {
        enabled: true,
        guest: options.guest ?? true,
        users: options.users ?? [
          { id: 'alice', name: 'Alice' },
          { id: 'bob', name: 'Bob' },
        ],
      })
    if (path === '/collect/events') return jsonResponse(200, { accepted: 1 })
    if (path.startsWith('/collect/images/'))
      return jsonResponse(200, init.method === 'GET' ? { exists: true } : {})
    return jsonResponse(200, { features: [] })
  })
  const timers: (() => void)[] = []
  const auth = new AuthSession({
    baseUrl: '/api',
    fetch: fetchFn as unknown as typeof fetch,
    storage,
    window: null,
    now: () => Date.parse('2026-11-24T00:00:00Z'),
  })
  const client = new CollectClient({
    baseUrl: '/api',
    app: { commit: null, version: '2.0.0', build: null },
    fetch: fetchFn as unknown as typeof fetch,
    storage,
    auth,
    setTimer: (fn) => {
      timers.push(fn)
      return fn
    },
    clearTimer: (timer) => {
      const i = timers.indexOf(timer as () => void)
      if (i >= 0) timers.splice(i, 1)
    },
    warn: () => undefined,
  })
  const runTimers = async () => {
    while (timers.length) {
      timers.shift()?.()
      await settle()
    }
  }
  const events = () => calls.filter((c) => c.url.endsWith('/collect/events'))
  return { client, auth, calls, events, fetchFn, runTimers, valid, storage }
}

async function started(s: ReturnType<typeof setup>) {
  await s.client.start()
  s.client.markNoticeShown()
  await settle()
}

describe('CollectClient with passwords', () => {
  it('holds events until the person signs in, then sends them with the token only', async () => {
    const s = setup()
    await started(s)
    expect(s.auth.phase).toBe('signed-out')
    expect(s.client.user).toBeUndefined()
    s.client.record('edit', { action: 'point.add' })
    await s.runTimers()
    expect(s.events()).toHaveLength(0)
    expect(await s.auth.login('alice', 'right')).toMatchObject({ ok: true })
    await s.runTimers()
    expect(s.events()).toHaveLength(1)
    expect(s.events()[0].headers[TOKEN_HEADER]).toBe('tok-1')
    expect(s.events()[0].headers['X-WPD-User']).toBeUndefined()
    expect(s.client.userName).toBe('ALICE')
  })

  it("offers the server's names but takes no name from storage", async () => {
    const s = setup()
    s.storage.setItem('starry-digitizer.staging.user', '{"user":"alice"}')
    await started(s)
    expect(s.client.users).toHaveLength(2)
    expect(s.client.user).toBeUndefined()
    expect(s.client.needsUserChoice).toBe(false)
  })

  it('sends as Guest (no token) once Guest is chosen', async () => {
    const s = setup()
    await started(s)
    s.client.record('edit', {})
    s.client.chooseUser('alice')
    expect(s.client.user).toBeUndefined()
    s.client.chooseUser(null)
    await s.runTimers()
    expect(s.events()).toHaveLength(1)
    expect(s.events()[0].headers[TOKEN_HEADER]).toBeUndefined()
    expect(s.events()[0].headers['X-WPD-User']).toBeUndefined()
  })

  it('does not offer Guest when the server allows none', async () => {
    const s = setup({ guest: false })
    await started(s)
    s.client.chooseUser(null)
    expect(s.client.user).toBeUndefined()
  })

  it("keeps a refused token's events and sends them after the next sign-in", async () => {
    const s = setup({ kept: { token: 'old', id: 'alice' } })
    await started(s)
    expect(s.auth.phase).toBe('signed-in')
    s.client.record('edit', { n: 1 })
    s.valid.delete('old')
    await s.runTimers()
    expect(s.events()).toHaveLength(1)
    expect(s.auth.phase).toBe('signed-out')
    expect(s.auth.signOutReason).toBe('invalid')
    expect(s.client.pending).toBe(1)
    expect(s.storage.data.has(KEY)).toBe(false)
    s.client.record('edit', { n: 2 })
    await s.auth.login('alice', 'right')
    await s.runTimers()
    const last = s.events().at(-1)
    expect(last?.headers[TOKEN_HEADER]).toBe('tok-1')
    expect(s.client.pending).toBe(0)
  })

  it("sends a person's events before signing out, and the next ones wait", async () => {
    const s = setup()
    const views: CollectView[] = []
    const handle = startCollect(createDigitizerContext(), '/api', {
      version: '2.0.0',
      client: s.client,
      auth: s.auth,
      fetch: s.fetchFn as unknown as typeof fetch,
      onChange: (view) => views.push(view),
      afterRender: async () => undefined,
    })
    await settle()
    await settle()
    expect(views.at(-1)?.login).toMatchObject({ on: true, needed: true })
    expect(views.at(-1)?.hasNames).toBe(false)
    expect(await handle.signIn('bob', 'wrong')).toEqual({
      ok: false,
      error: 'invalid_login',
    })
    await handle.signIn('bob', 'right')
    expect(views.at(-1)?.login).toMatchObject({
      needed: false,
      userName: 'BOB',
    })
    s.client.record('edit', {})
    await handle.signOut()
    expect(s.events().at(-1)?.headers[TOKEN_HEADER]).toBe('tok-1')
    const logout = s.calls.find((c) => c.url.endsWith('/auth/logout'))
    expect(logout?.headers[TOKEN_HEADER]).toBe('tok-1')
    expect(views.at(-1)?.login).toMatchObject({
      needed: true,
      reason: 'signed-out',
      lastUser: 'bob',
    })
    handle.stop()
  })

  it("keeps today's name labels when the server is in label mode", async () => {
    const s = setup({ login: 'label' })
    s.storage.setItem('starry-digitizer.staging.user', '{"user":"alice"}')
    await started(s)
    expect(s.auth.phase).toBe('none')
    expect(s.client.user).toBe('alice')
    s.client.record('edit', {})
    await s.runTimers()
    expect(s.events()[0].headers['X-WPD-User']).toBe('alice')
    expect(s.events()[0].headers[TOKEN_HEADER]).toBeUndefined()
  })
})

describe('the auto service with passwords', () => {
  async function service(kept?: { token: string; id: string }) {
    const s = setup({ kept })
    const ctx = createDigitizerContext()
    const handle = startCollect(ctx, '/api', {
      version: '2.0.0',
      client: s.client,
      auth: s.auth,
      fetch: s.fetchFn as unknown as typeof fetch,
      onChange: () => undefined,
      afterRender: async () => undefined,
    })
    return { ...s, handle, ctx }
  }

  it('puts the token on every route, the first ones too', async () => {
    const s = await service({ token: 'tok-a', id: 'alice' })
    const svc = s.handle.service
    await svc.capabilities()
    await svc.methods?.()
    await svc.status?.()
    await svc.components?.()
    await svc.legend?.({ image: 'x' })
    await svc.calibrate(new Blob(['x'], { type: 'image/png' }))
    await svc.extract(new Blob(['x'], { type: 'image/png' }), {
      method: 'markers',
    })
    const routes = [
      '/capabilities',
      '/extract/methods',
      '/components',
      '/legend',
      '/calibrate',
      '/extract?',
    ]
    for (const route of routes) {
      const call = s.calls.find((c) => c.url.includes(route))
      expect([route, call?.headers[TOKEN_HEADER]]).toEqual([route, 'tok-a'])
      expect(call?.headers['X-WPD-User']).toBeUndefined()
    }
    s.handle.stop()
  })

  it('drops a refused token; the next action uses the new one', async () => {
    const s = await service({ token: 'tok-a', id: 'alice' })
    await settle()
    await settle()
    s.valid.delete('tok-a')
    const image = new Blob(['x'], { type: 'image/png' })
    await expect(s.handle.service.calibrate(image)).rejects.toThrow()
    expect(s.auth.phase).toBe('signed-out')
    await s.handle.signIn('alice', 'right')
    await s.handle.service.calibrate(image)
    const last = s.calls.filter((c) => c.url.includes('/calibrate')).at(-1)
    expect(last?.headers[TOKEN_HEADER]).toBe('tok-1')
    s.handle.stop()
  })
})
