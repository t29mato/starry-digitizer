/**
 * @jest-environment node
 */
import { AuthSession, AuthStorage, TOKEN_HEADER } from './auth'
import { CollectClient } from './collectClient'
import { createCollectingAutoService } from './collectWiring'

// INFO: OPT-IN, against a running backend. Skipped unless AUTH_BACKEND_URL
// is set, e.g.
//   AUTH_BACKEND_URL=http://127.0.0.1:24865/api/v1 \
//   AUTH_BACKEND_USER=alice AUTH_BACKEND_PASSWORD=... \
//     npx jest src/hosting/collect/auth.backend.test.ts
// A backend without /auth/status (404, today's wpd-auto) must leave the page
// as it was (name labels); one with `login: password` is signed in to with
// AUTH_BACKEND_USER / AUTH_BACKEND_PASSWORD. docs/design/starryai-auto.md §11.
const BASE = process.env.AUTH_BACKEND_URL
const USER = process.env.AUTH_BACKEND_USER ?? 'alice'
const PASSWORD = process.env.AUTH_BACKEND_PASSWORD ?? ''
const run = BASE ? describe : describe.skip

function memoryStorage(): AuthStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

type Seen = { url: string; headers: Record<string, string>; status: number }

function recordingFetch(seen: Seen[]): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const response = await fetch(input, init)
    seen.push({
      url: String(input),
      headers: { ...((init?.headers ?? {}) as Record<string, string>) },
      status: response.status,
    })
    return response
  }) as typeof fetch
}

function setup() {
  const seen: Seen[] = []
  const storage = memoryStorage()
  const doFetch = recordingFetch(seen)
  const auth = new AuthSession({
    baseUrl: BASE as string,
    fetch: doFetch,
    storage,
    window: null,
  })
  const client = new CollectClient({
    baseUrl: BASE as string,
    app: { commit: null, version: '2.0.0', build: null },
    fetch: doFetch,
    storage,
    auth,
    batchDelayMs: 0,
  })
  const service = createCollectingAutoService(
    client,
    { baseUrl: BASE as string, fetch: auth.wrapFetch(doFetch) },
    { calibrate: null, extract: null },
  )
  return { seen, storage, auth, client, service }
}

run('auth against a running backend', () => {
  jest.setTimeout(30000)

  it("follows the server's login mode", async () => {
    const s = setup()
    await s.client.start()
    s.client.markNoticeShown()
    if (!s.auth.passwordMode) {
      // INFO: an older backend (no /auth/*): nothing changes
      expect(s.auth.phase).toBe('none')
      expect(s.seen.find((x) => x.url.endsWith('/auth/status'))?.status).toBe(
        404,
      )
      await s.service.capabilities()
      const caps = s.seen.find((x) => x.url.endsWith('/capabilities'))
      expect(caps?.headers[TOKEN_HEADER]).toBeUndefined()
      return
    }
    expect(s.auth.phase).toBe('signed-out')
    expect(await s.auth.login(USER, 'certainly-wrong')).toMatchObject({
      ok: false,
      error: 'invalid_login',
    })
    expect(await s.auth.login(USER, PASSWORD)).toMatchObject({ ok: true })
    const token = s.auth.token()
    expect(token).toBeTruthy()
    s.client.record('edit', { action: 'auth.backend.test' })
    await s.client.flush()
    const events = s.seen.filter((x) => x.url.endsWith('/collect/events'))
    expect(events.at(-1)?.status).toBe(200)
    expect(events.at(-1)?.headers[TOKEN_HEADER]).toBe(token)
    expect(events.at(-1)?.headers['X-WPD-User']).toBeUndefined()
    await s.service.capabilities()
    expect(
      s.seen.filter((x) => x.url.endsWith('/capabilities')).at(-1)?.headers[
        TOKEN_HEADER
      ],
    ).toBe(token)

    // INFO: the token is revoked behind the page's back (as by the admin page
    // or the other app): the next request is 401 and the page drops it
    await fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { [TOKEN_HEADER]: token as string },
    })
    s.client.record('edit', { action: 'auth.backend.test.after' })
    await s.client.flush()
    expect(
      s.seen.filter((x) => x.url.endsWith('/collect/events')).at(-1)?.status,
    ).toBe(401)
    expect(s.auth.phase).toBe('signed-out')
    expect(s.client.pending).toBe(1)
    expect(await s.auth.login(USER, PASSWORD)).toMatchObject({ ok: true })
    await s.client.flush()
    expect(s.client.pending).toBe(0)
    await s.auth.logout()
    expect(s.auth.phase).toBe('signed-out')
    s.client.stop()
  })
})
