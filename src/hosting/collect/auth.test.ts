import {
  AuthSession,
  AuthStorage,
  TOKEN_HEADER,
  authStorageKey,
  parseStoredAuth,
} from './auth'

// INFO: a fake of the DRAFT auth API (wpd-auto feat/user-passwords
// docs/user-passwords.md §3) and an in-memory localStorage

function jsonResponse(status: number, body: unknown, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers)),
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

const FUTURE = '2099-01-01T00:00:00Z'
const PAST = '2000-01-01T00:00:00Z'
const KEY = 'starrydata-auth--staging'

function kept(token = 'tok-a', id = 'alice', expires = FUTURE) {
  return JSON.stringify({
    token,
    user: { id, name: id[0].toUpperCase() + id.slice(1) },
    expires_at: expires,
  })
}

type Call = { url: string; init: RequestInit }

function setup(
  options: {
    status?: number
    statusBody?: unknown
    me?: (token: string) => [number, unknown]
    login?: [number, unknown, Record<string, string>?]
    storage?: AuthStorage | null
  } = {},
) {
  const calls: Call[] = []
  const storage =
    options.storage === undefined ? memoryStorage() : options.storage
  const listeners: ((event: StorageEvent) => void)[] = []
  const win = {
    addEventListener: (_: string, fn: (event: StorageEvent) => void) =>
      listeners.push(fn),
    removeEventListener: (_: string, fn: (event: StorageEvent) => void) => {
      const i = listeners.indexOf(fn)
      if (i >= 0) listeners.splice(i, 1)
    },
  } as unknown as Window
  const fetchFn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const headers = (init.headers ?? {}) as Record<string, string>
    if (url.endsWith('/auth/status')) {
      return jsonResponse(
        options.status ?? 200,
        options.statusBody ?? { login: 'password', guest: true },
      )
    }
    if (url.endsWith('/auth/me')) {
      const [status, body] = options.me
        ? options.me(headers[TOKEN_HEADER])
        : [200, { user: { id: 'alice', name: 'Alice' }, expires_at: FUTURE }]
      return jsonResponse(status, body)
    }
    if (url.endsWith('/auth/login')) {
      const [status, body, h] = options.login ?? [
        200,
        {
          token: 'tok-new',
          user: { id: 'bob', name: 'Bob' },
          expires_at: FUTURE,
        },
      ]
      return jsonResponse(status, body, h)
    }
    if (url.endsWith('/auth/logout')) return jsonResponse(204, null)
    return jsonResponse(404, { error: 'not_found' })
  })
  const session = new AuthSession({
    baseUrl: '/api/',
    fetch: fetchFn as unknown as typeof fetch,
    storage,
    window: win,
    now: () => Date.parse('2026-11-24T00:00:00Z'),
    headers: () => ({ 'X-WPD-App': 'starry-digitizer' }),
  })
  const fire = (key: string | null, newValue: string | null) =>
    listeners.forEach((fn) => fn({ key, newValue } as StorageEvent))
  return { session, calls, storage, fetchFn, fire, listeners }
}

describe('authStorageKey', () => {
  it('uses the shared key of each environment', () => {
    expect(authStorageKey('staging')).toBe('starrydata-auth--staging')
    expect(authStorageKey('production')).toBe('starrydata-auth')
    expect(authStorageKey(null)).toBe('starrydata-auth')
    expect(authStorageKey('../x')).toBe('starrydata-auth')
  })
})

describe('parseStoredAuth', () => {
  it('accepts the shared shape only', () => {
    expect(parseStoredAuth(kept())).toMatchObject({ token: 'tok-a' })
    expect(parseStoredAuth('{"token":"x"}')).toBeNull()
    expect(parseStoredAuth('not json')).toBeNull()
    expect(parseStoredAuth(null)).toBeNull()
    expect(
      parseStoredAuth(
        JSON.stringify({
          token: 'x',
          user: { id: 'a', name: 'A' },
          expires_at: 'soon',
        }),
      ),
    ).toBeNull()
  })
})

describe('AuthSession.start', () => {
  it("keeps today's behaviour when the server has no auth route (404)", async () => {
    const { session, listeners } = setup({ status: 404, statusBody: {} })
    await session.start('staging')
    expect(session.mode).toBeNull()
    expect(session.phase).toBe('none')
    expect(session.headers()).toEqual({})
    expect(listeners).toHaveLength(0)
  })

  it('is not password mode for label / off', async () => {
    for (const login of ['label', 'off']) {
      const { session } = setup({ statusBody: { login, guest: true } })
      await session.start('staging')
      expect(session.mode).toBe(login)
      expect(session.passwordMode).toBe(false)
      expect(session.phase).toBe('none')
    }
  })

  it('treats an unreachable server as no password mode', async () => {
    const { session, fetchFn } = setup()
    fetchFn.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await session.start('staging')
    expect(session.phase).toBe('none')
  })

  it('is signed out without a kept token', async () => {
    const { session, calls } = setup({
      statusBody: { login: 'password', guest: false },
    })
    await session.start('staging')
    expect(session.phase).toBe('signed-out')
    expect(session.guestAllowed).toBe(false)
    expect(calls.map((c) => c.url)).toEqual(['/api/auth/status'])
  })

  it('checks a kept token with /auth/me and takes its answer', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, kept())
    const { session, calls } = setup({
      storage,
      me: () => [
        200,
        { user: { id: 'alice', name: 'Alice A.' }, expires_at: FUTURE },
      ],
    })
    await session.start('staging')
    expect(session.phase).toBe('signed-in')
    expect(session.user).toEqual({ id: 'alice', name: 'Alice A.' })
    expect(session.headers()).toEqual({ [TOKEN_HEADER]: 'tok-a' })
    const me = calls.find((c) => c.url.endsWith('/auth/me'))
    expect((me?.init.headers as Record<string, string>)[TOKEN_HEADER]).toBe(
      'tok-a',
    )
  })

  it('drops a kept token the server refuses', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, kept())
    const { session } = setup({
      storage,
      me: () => [401, { error: 'invalid_token' }],
    })
    await session.start('staging')
    expect(session.phase).toBe('signed-out')
    expect(session.signOutReason).toBe('invalid')
    expect(session.lastUserId).toBe('alice')
    expect(storage.data.has(KEY)).toBe(false)
  })

  it('drops an expired token without asking', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, kept('tok-a', 'alice', PAST))
    const { session, calls } = setup({ storage })
    await session.start('staging')
    expect(session.phase).toBe('signed-out')
    expect(session.signOutReason).toBe('expired')
    expect(calls.some((c) => c.url.endsWith('/auth/me'))).toBe(false)
  })

  it('keeps the token when /auth/me cannot be reached', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, kept())
    const { session } = setup({ storage, me: () => [503, {}] })
    await session.start('staging')
    expect(session.phase).toBe('signed-in')
  })

  it('works with blocked storage', async () => {
    const broken: AuthStorage = {
      getItem() {
        throw new Error('SecurityError')
      },
      setItem() {
        throw new Error('QuotaExceededError')
      },
      removeItem() {
        throw new Error('SecurityError')
      },
    }
    const { session } = setup({ storage: broken })
    await session.start('staging')
    expect(session.phase).toBe('signed-out')
    expect(await session.login('bob', 'pw')).toMatchObject({ ok: true })
    expect(session.phase).toBe('signed-in')
    await session.logout()
    expect(session.phase).toBe('signed-out')
  })
})

describe('AuthSession.login / logout', () => {
  it('signs in, keeps the shared value and never keeps the password', async () => {
    const { session, storage, calls } = setup()
    await session.start('staging')
    const result = await session.login(' bob ', 'secret-pw')
    expect(result).toEqual({ ok: true, user: { id: 'bob', name: 'Bob' } })
    const call = calls.find((c) => c.url.endsWith('/auth/login'))
    expect(call?.url).toBe('/api/auth/login')
    expect(call?.init.method).toBe('POST')
    expect(JSON.parse(call?.init.body as string)).toEqual({
      user: 'bob',
      password: 'secret-pw',
    })
    const value = (storage as ReturnType<typeof memoryStorage>).data.get(KEY)
    expect(JSON.parse(value ?? '')).toEqual({
      token: 'tok-new',
      user: { id: 'bob', name: 'Bob' },
      expires_at: FUTURE,
    })
    expect(value).not.toContain('secret-pw')
  })

  it.each([
    [401, { error: 'invalid_login' }, {}, { error: 'invalid_login' }],
    [
      429,
      { error: 'rate_limited' },
      { 'Retry-After': '600' },
      { error: 'rate_limited', retryAfter: 600 },
    ],
    [400, { error: 'invalid_params' }, {}, { error: 'invalid_params' }],
    [404, { error: 'login_disabled' }, {}, { error: 'login_disabled' }],
    [500, {}, {}, { error: 'http', status: 500 }],
  ])('answers %i as an error', async (status, body, headers, expected) => {
    const { session } = setup({ login: [status, body, headers] })
    await session.start('staging')
    expect(await session.login('bob', 'pw')).toEqual({ ok: false, ...expected })
    expect(session.phase).toBe('signed-out')
  })

  it('reports a network failure', async () => {
    const { session, fetchFn } = setup()
    await session.start('staging')
    fetchFn.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await session.login('bob', 'pw')).toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('does not send an empty or oversized login', async () => {
    const { session, calls } = setup()
    await session.start('staging')
    expect(await session.login('', 'pw')).toMatchObject({
      error: 'invalid_params',
    })
    expect(await session.login('bob', 'x'.repeat(5000))).toMatchObject({
      error: 'invalid_params',
    })
    expect(calls.some((c) => c.url.endsWith('/auth/login'))).toBe(false)
  })

  it('signs out on the server and in the browser', async () => {
    const { session, storage, calls } = setup()
    await session.start('staging')
    await session.login('bob', 'pw')
    await session.logout()
    const call = calls.find((c) => c.url.endsWith('/auth/logout'))
    expect((call?.init.headers as Record<string, string>)[TOKEN_HEADER]).toBe(
      'tok-new',
    )
    expect(session.phase).toBe('signed-out')
    expect(session.signOutReason).toBe('signed-out')
    expect((storage as ReturnType<typeof memoryStorage>).data.has(KEY)).toBe(
      false,
    )
  })
})

describe('AuthSession and the other page (storage event)', () => {
  it('picks up a sign-in and a sign-out of the other page', async () => {
    const { session, fire } = setup()
    await session.start('staging')
    const changes = jest.fn()
    session.subscribe(changes)
    fire('starrydata-auth', kept('tok-prod'))
    expect(session.phase).toBe('signed-out')
    fire(KEY, kept('tok-b', 'bob'))
    expect(session.user?.id).toBe('bob')
    expect(session.token()).toBe('tok-b')
    fire(KEY, null)
    expect(session.phase).toBe('signed-out')
    expect(session.signOutReason).toBe('elsewhere')
    expect(changes).toHaveBeenCalledTimes(2)
  })

  it('stops listening on stop()', async () => {
    const { session, listeners } = setup()
    await session.start('staging')
    expect(listeners).toHaveLength(1)
    session.stop()
    expect(listeners).toHaveLength(0)
  })
})

describe('AuthSession.invalidate and expiry', () => {
  it('drops only the token that was refused', async () => {
    const { session } = setup()
    await session.start('staging')
    await session.login('bob', 'pw')
    session.invalidate('an-older-token')
    expect(session.phase).toBe('signed-in')
    session.invalidate('tok-new')
    expect(session.phase).toBe('signed-out')
    expect(session.signOutReason).toBe('invalid')
  })

  it('drops a token that expires while the page is open', async () => {
    let now = Date.parse('2026-11-24T00:00:00Z')
    const { fetchFn } = setup()
    const session = new AuthSession({
      baseUrl: '/api',
      fetch: fetchFn as unknown as typeof fetch,
      storage: memoryStorage(),
      window: null,
      now: () => now,
    })
    await session.start('staging')
    await session.login('bob', 'pw')
    now = Date.parse(FUTURE) + 1
    expect(session.headers()).toEqual({})
    expect(session.signOutReason).toBe('expired')
  })
})

describe('AuthSession.wrapFetch', () => {
  async function signedIn() {
    const s = setup()
    await s.session.start('staging')
    await s.session.login('bob', 'pw')
    const base = jest.fn(async (_url: string, init: RequestInit) => {
      void init
      return jsonResponse(200, {})
    })
    return { ...s, base }
  }

  it('puts the current token on and never X-WPD-User', async () => {
    const { session, base } = await signedIn()
    const wrapped = session.wrapFetch(base as unknown as typeof fetch)
    await wrapped('/api/calibrate', {
      method: 'POST',
      headers: { 'X-WPD-User': 'mallory', [TOKEN_HEADER]: 'stale' },
    })
    expect(base.mock.calls[0][1].headers).toEqual({ [TOKEN_HEADER]: 'tok-new' })
  })

  it('keeps X-WPD-User outside password mode', async () => {
    const { session } = setup({ statusBody: { login: 'label', guest: true } })
    await session.start('staging')
    const base = jest.fn(async () => jsonResponse(200, {}))
    await session.wrapFetch(base as unknown as typeof fetch)('/api/x', {
      headers: { 'X-WPD-User': 'alice' },
    })
    expect(base.mock.calls[0]).toEqual([
      '/api/x',
      { headers: { 'X-WPD-User': 'alice' } },
    ])
  })

  it('drops the token on 401 invalid_token and sends the next one without it', async () => {
    const { session, base } = await signedIn()
    base.mockResolvedValueOnce(jsonResponse(401, { error: 'invalid_token' }))
    const wrapped = session.wrapFetch(base as unknown as typeof fetch)
    const response = await wrapped('/api/extract', { method: 'POST' })
    expect(response.status).toBe(401)
    expect(session.phase).toBe('signed-out')
    await wrapped('/api/extract', { method: 'POST' })
    expect(base.mock.calls[1][1].headers).toEqual({})
  })

  it('keeps the token on another 401', async () => {
    const { session, base } = await signedIn()
    base.mockResolvedValueOnce(jsonResponse(401, { error: 'other' }))
    await session.wrapFetch(base as unknown as typeof fetch)('/api/x', {})
    expect(session.phase).toBe('signed-in')
  })

  it('waits for start() before the first request', async () => {
    const storage = memoryStorage()
    storage.setItem(KEY, kept())
    const { session } = setup({ storage })
    const base = jest.fn(async () => jsonResponse(200, {}))
    const pending = session.wrapFetch(base as unknown as typeof fetch)(
      '/api/capabilities',
      { headers: { 'X-WPD-App': 'starry-digitizer' } },
    )
    await Promise.resolve()
    expect(base).not.toHaveBeenCalled()
    await session.start('staging')
    await pending
    expect(base.mock.calls[0][1]).toEqual({
      headers: { 'X-WPD-App': 'starry-digitizer', [TOKEN_HEADER]: 'tok-a' },
    })
  })
})
