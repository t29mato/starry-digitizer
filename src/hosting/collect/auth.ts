import {
  KeyValueStorage,
  browserStorage,
  readItem,
  utf8Length,
  writeItem,
} from './collectStorage'

// INFO: per-person passwords of the wpd-auto backend (DRAFT: wpd-auto
// `feat/user-passwords` docs/user-passwords.md 0.0.1; may still change).
// docs/design/starryai-auto.md §11.
//
// - `GET /auth/status` says how the server tells people apart:
//   `password` (a login, a token), `label` (today's free choice of a name,
//   X-WPD-User) or `off`. A server without the route (404, older backends)
//   is `label`: the page behaves exactly as before.
// - In password mode ONLY the token (`X-WPD-Token`) decides the person; no
//   token = Guest. A token the server no longer accepts gets 401
//   `invalid_token` on ANY route: the page drops it and asks to sign in again.
// - The token is kept where the wpd-auto page keeps it (the two pages share
//   one origin), so signing in or out on one page is seen by the other
//   (the `storage` event).
//
// Passwords are never kept, logged or put in a URL: login() sends the one it
// is given in a JSON body and forgets it.

export const TOKEN_HEADER = 'X-WPD-Token'

export type LoginMode = 'password' | 'label' | 'off'

/**
 * - `starting`: not asked yet
 * - `none`: no password mode (label / off / an older server): nothing changes
 * - `signed-out`: password mode, no token
 * - `signed-in`: password mode, a token
 */
export type AuthPhase = 'starting' | 'none' | 'signed-out' | 'signed-in'

export interface AuthUser {
  id: string
  name: string
}

/** What is kept under `starrydata-auth` (shared with the wpd-auto page). */
export interface StoredAuth {
  token: string
  user: AuthUser
  expires_at: string
}

export type LoginError =
  | 'invalid_login'
  | 'rate_limited'
  | 'invalid_params'
  | 'login_disabled'
  | 'network'
  | 'http'

export type LoginResult =
  | { ok: true; user: AuthUser }
  | {
      ok: false
      error: LoginError
      /** seconds to wait (rate_limited, from Retry-After) */
      retryAfter?: number
      /** the HTTP status (http) */
      status?: number
    }

/** Why the token went away (for the page's wording). */
export type SignOutReason = 'signed-out' | 'invalid' | 'expired' | 'elsewhere'

type StorageEventTarget = Pick<
  Window,
  'addEventListener' | 'removeEventListener'
>

export interface AuthSessionOptions {
  /** the auto service's base URL, e.g. `/wpd-auto/api/v1` */
  baseUrl: string
  fetch?: typeof fetch
  /** default: localStorage (null = nothing is kept) */
  storage?: AuthStorage | null
  /** where `storage` events arrive; default: window (null = none) */
  window?: StorageEventTarget | null
  now?: () => number
  /** extra headers of the auth requests (X-WPD-App) */
  headers?: () => Record<string, string>
  /** give up on status / me after this long (ms) */
  probeTimeoutMs?: number
}

export interface AuthStorage extends KeyValueStorage {
  removeItem?(key: string): void
}

// INFO: the server takes at most 4 KiB for the login body; a longer password
// cannot be right, so it is not sent at all
const MAX_LOGIN_BYTES = 4096
const ENVIRONMENT_RE = /^[a-z][a-z0-9-]{0,31}$/
const DEFAULT_PROBE_TIMEOUT_MS = 5000

type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

/**
 * The localStorage key of the token: `starrydata-auth` for production,
 * `starrydata-auth--<environment>` otherwise (the draft names `staging` only;
 * other environments follow the same pattern — a guess).
 */
export function authStorageKey(environment: unknown): string {
  if (
    typeof environment !== 'string' ||
    !ENVIRONMENT_RE.test(environment) ||
    environment === 'production'
  ) {
    return 'starrydata-auth'
  }
  return `starrydata-auth--${environment}`
}

function isAuthUser(value: unknown): value is AuthUser {
  const v = value as AuthUser
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    v.id !== '' &&
    typeof v.name === 'string'
  )
}

/** The kept token, or null when missing, damaged or of another shape. */
export function parseStoredAuth(text: string | null): StoredAuth | null {
  if (!text) return null
  try {
    const value = JSON.parse(text) as Partial<StoredAuth>
    if (
      value &&
      typeof value === 'object' &&
      typeof value.token === 'string' &&
      value.token !== '' &&
      isAuthUser(value.user) &&
      typeof value.expires_at === 'string' &&
      Number.isFinite(Date.parse(value.expires_at))
    ) {
      return {
        token: value.token,
        user: { id: value.user.id, name: value.user.name },
        expires_at: value.expires_at,
      }
    }
  } catch {
    // INFO: damaged = none; the person signs in again
  }
  return null
}

/** The error code of a JSON error answer (`{"error": code}`), if any. */
export async function errorCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const source =
      typeof response.clone === 'function' ? response.clone() : response
    const body = (await source.json()) as { error?: unknown }
    return typeof body?.error === 'string' ? body.error : undefined
  } catch {
    return undefined
  }
}

function withoutHeader(
  headers: FetchInit['headers'],
  name: string,
): Record<string, string> {
  const out: Record<string, string> = {}
  const add = (k: string, v: string) => {
    if (k.toLowerCase() !== name.toLowerCase()) out[k] = v
  }
  if (!headers) return out
  if (typeof Headers !== 'undefined' && headers instanceof Headers)
    headers.forEach((v, k) => add(k, v))
  else if (Array.isArray(headers)) headers.forEach(([k, v]) => add(k, v))
  else Object.entries(headers).forEach(([k, v]) => add(k, v))
  return out
}

export class AuthSession {
  mode: LoginMode | null = null
  guestAllowed = true
  phase: AuthPhase = 'starting'
  /** why the last token went away; null while one is kept */
  signOutReason: SignOutReason | null = null
  /** the id of the person whose token went away (to offer it again) */
  lastUserId: string | null = null
  /** resolves once start() has decided the phase (never rejects) */
  readonly ready: Promise<void>

  private auth: StoredAuth | null = null
  private key = authStorageKey(null)
  private resolveReady: () => void = () => undefined
  private listeners = new Set<() => void>()
  private readonly opts: {
    baseUrl: string
    fetch: typeof fetch
    storage: AuthStorage | null
    window: StorageEventTarget | null
    now: () => number
    headers: () => Record<string, string>
    probeTimeoutMs: number
  }
  private readonly onStorage = (event: StorageEvent) =>
    this.storageChanged(event)

  constructor(options: AuthSessionOptions) {
    this.opts = {
      baseUrl: options.baseUrl.replace(/\/+$/, ''),
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      storage:
        options.storage === undefined
          ? (browserStorage() as AuthStorage | null)
          : options.storage,
      window:
        options.window === undefined
          ? typeof window === 'undefined'
            ? null
            : window
          : options.window,
      now: options.now ?? (() => Date.now()),
      headers: options.headers ?? (() => ({})),
      probeTimeoutMs: options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS,
    }
    this.ready = new Promise((resolve) => (this.resolveReady = resolve))
  }

  // --- state ---------------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    this.listeners.forEach((listener) => listener())
  }

  get passwordMode(): boolean {
    return this.mode === 'password'
  }

  /** The signed-in person, null when none (or not password mode). */
  get user(): AuthUser | null {
    return this.phase === 'signed-in' ? this.auth?.user ?? null : null
  }

  get storageKey(): string {
    return this.key
  }

  /**
   * The token to send now, null when none. An expired one is dropped here
   * (the page then asks to sign in again) instead of being sent for a 401.
   */
  token(): string | null {
    if (this.phase !== 'signed-in' || !this.auth) return null
    if (this.isExpired(this.auth)) {
      this.drop('expired')
      return null
    }
    return this.auth.token
  }

  /** `X-WPD-Token` when signed in, nothing otherwise. */
  headers(): Record<string, string> {
    const token = this.token()
    return token ? { [TOKEN_HEADER]: token } : {}
  }

  private isExpired(auth: StoredAuth): boolean {
    return Date.parse(auth.expires_at) <= this.opts.now()
  }

  // --- start ---------------------------------------------------------------

  /** No login at all (a page without one): ready at once, nothing changes. */
  disable(): void {
    this.mode = null
    this.phase = 'none'
    this.resolveReady()
  }

  /**
   * Ask the server for its login mode and check a kept token. `environment`
   * is `/collect/status`'s (it chooses the storage key). Never rejects.
   */
  async start(environment: string | null): Promise<void> {
    try {
      this.key = authStorageKey(environment)
      const status = await this.getJson('/auth/status', {})
      const login = status.body?.login
      if (
        status.status === 200 &&
        (login === 'password' || login === 'label' || login === 'off')
      ) {
        this.mode = login
        this.guestAllowed = status.body?.guest !== false
      } else {
        // INFO: 404 (an older backend), an answer of another shape, or no
        // answer at all: the page keeps today's behaviour (name labels)
        this.mode = null
      }
      if (this.mode !== 'password') {
        this.phase = 'none'
        return
      }
      this.opts.window?.addEventListener('storage', this.onStorage)
      const kept = parseStoredAuth(readItem(this.opts.storage, this.key))
      if (!kept) {
        this.phase = 'signed-out'
        return
      }
      if (this.isExpired(kept)) {
        this.removeKept()
        this.phase = 'signed-out'
        this.signOutReason = 'expired'
        this.lastUserId = kept.user.id
        return
      }
      const me = await this.getJson('/auth/me', { [TOKEN_HEADER]: kept.token })
      if (me.status === 401) {
        this.lastUserId = kept.user.id
        // INFO: the token was revoked (password made again, person disabled,
        // logged out elsewhere): drop it rather than go on as Guest
        this.removeKept(kept.token)
        this.phase = 'signed-out'
        this.signOutReason = 'invalid'
        return
      }
      this.auth = kept
      const answer = me.body
      if (me.status === 200 && answer && isAuthUser(answer.user)) {
        const user = answer.user
        this.auth = {
          token: kept.token,
          user: { id: user.id, name: user.name },
          expires_at:
            typeof answer.expires_at === 'string' &&
            Number.isFinite(Date.parse(answer.expires_at))
              ? answer.expires_at
              : kept.expires_at,
        }
      }
      // INFO: anything else (unreachable, 5xx): keep the token; a request
      // that is refused later gets its 401 and is handled then
      this.phase = 'signed-in'
    } finally {
      if (this.phase === 'starting') this.phase = 'none'
      this.resolveReady()
      this.changed()
    }
  }

  private async getJson(
    path: string,
    headers: Record<string, string>,
  ): Promise<{ status: number; body: Record<string, unknown> | null }> {
    const controller =
      typeof AbortController === 'undefined' ? undefined : new AbortController()
    const timer = setTimeout(
      () => controller?.abort(),
      this.opts.probeTimeoutMs,
    )
    try {
      const response = await this.opts.fetch(`${this.opts.baseUrl}${path}`, {
        method: 'GET',
        headers: { ...this.opts.headers(), ...headers },
        credentials: 'same-origin',
        signal: controller?.signal,
      })
      let body: Record<string, unknown> | null = null
      try {
        body = (await response.json()) as Record<string, unknown>
      } catch {
        body = null
      }
      return { status: response.status, body }
    } catch {
      return { status: 0, body: null }
    } finally {
      clearTimeout(timer)
    }
  }

  // --- login / logout ------------------------------------------------------

  /** Sign in. The password is sent once, in the body, and not kept. */
  async login(user: string, password: string): Promise<LoginResult> {
    const id = user.trim()
    if (!id || !password) return { ok: false, error: 'invalid_params' }
    const body = JSON.stringify({ user: id, password })
    if (utf8Length(body) > MAX_LOGIN_BYTES)
      return { ok: false, error: 'invalid_params' }
    let response: Response
    try {
      response = await this.opts.fetch(`${this.opts.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          ...this.opts.headers(),
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body,
      })
    } catch {
      return { ok: false, error: 'network' }
    }
    if (response.status === 200) {
      let answer: Record<string, unknown> | null = null
      try {
        answer = (await response.json()) as Record<string, unknown>
      } catch {
        answer = null
      }
      const kept = parseStoredAuth(answer ? JSON.stringify(answer) : null)
      if (!kept) return { ok: false, error: 'http', status: 200 }
      this.auth = kept
      writeItem(this.opts.storage, this.key, JSON.stringify(kept))
      this.phase = 'signed-in'
      this.signOutReason = null
      this.changed()
      return { ok: true, user: kept.user }
    }
    const code = await errorCode(response)
    if (response.status === 401) return { ok: false, error: 'invalid_login' }
    if (response.status === 429) {
      const header = Number(response.headers?.get?.('Retry-After'))
      return {
        ok: false,
        error: 'rate_limited',
        retryAfter:
          Number.isFinite(header) && header > 0 ? Math.ceil(header) : undefined,
      }
    }
    if (response.status === 400 && code === 'invalid_params')
      return { ok: false, error: 'invalid_params' }
    if (response.status === 404 && code === 'login_disabled')
      return { ok: false, error: 'login_disabled' }
    return { ok: false, error: 'http', status: response.status }
  }

  /**
   * Sign out: the server forgets the token (best effort), the page drops it
   * (and so does the other page of the same origin).
   */
  async logout(): Promise<void> {
    const token = this.auth?.token
    this.drop('signed-out')
    if (!token) return
    try {
      await this.opts.fetch(`${this.opts.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { ...this.opts.headers(), [TOKEN_HEADER]: token },
        credentials: 'same-origin',
      })
    } catch {
      // INFO: the token is gone from this browser either way; the server's
      // copy then simply ends with its 30 days
    }
  }

  /**
   * The server refused `token` (401 invalid_token). Dropped only if it is
   * still the current one — a request sent before a new sign-in must not
   * throw the new token away.
   */
  invalidate(token: string | null | undefined): void {
    if (!token || this.auth?.token !== token) return
    this.drop('invalid')
  }

  private drop(reason: SignOutReason): void {
    const had = this.auth
    this.auth = null
    if (had) {
      this.lastUserId = had.user.id
      this.removeKept(had.token)
    }
    if (this.phase === 'signed-in' || this.phase === 'signed-out') {
      this.phase = 'signed-out'
      this.signOutReason = reason
      this.changed()
    }
  }

  // INFO: only the token this page knows is removed — the other page may
  // have put a newer one there meanwhile
  private removeKept(token?: string): void {
    const kept = parseStoredAuth(readItem(this.opts.storage, this.key))
    if (token && kept && kept.token !== token) return
    try {
      if (this.opts.storage?.removeItem) this.opts.storage.removeItem(this.key)
      else writeItem(this.opts.storage, this.key, '')
    } catch {
      // INFO: blocked storage: nothing was kept there either
    }
  }

  private storageChanged(event: StorageEvent): void {
    if (event.key !== null && event.key !== this.key) return
    if (!this.passwordMode) return
    const next = parseStoredAuth(
      event.key === null ? null : event.newValue ?? null,
    )
    if (next && !this.isExpired(next)) {
      if (this.auth?.token === next.token) return
      // INFO: signed in (maybe as someone else) on the other page
      this.auth = next
      this.phase = 'signed-in'
      this.signOutReason = null
      this.changed()
      return
    }
    if (!this.auth) return
    // INFO: signed out on the other page (or storage cleared)
    this.lastUserId = this.auth.user.id
    this.auth = null
    this.phase = 'signed-out'
    this.signOutReason = 'elsewhere'
    this.changed()
  }

  // --- requests ------------------------------------------------------------

  /**
   * A fetch for the auto service's requests: waits for start() (so the very
   * first requests already carry a checked token), puts the CURRENT token on
   * (and never X-WPD-User in password mode), and drops the token when the
   * server answers 401 invalid_token. The answer is returned as it is, so
   * the action that failed shows its error; the next one goes without the
   * dropped token (or with the new one).
   */
  wrapFetch(base: typeof fetch, waitMs = DEFAULT_PROBE_TIMEOUT_MS) {
    return async (input: FetchInput, init?: FetchInit): Promise<Response> => {
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        this.ready,
        new Promise((resolve) => (timer = setTimeout(resolve, waitMs))),
      ])
      clearTimeout(timer)
      let headers = withoutHeader(init?.headers, TOKEN_HEADER)
      if (this.passwordMode) headers = withoutHeader(headers, 'X-WPD-User')
      const token = this.passwordMode ? this.token() : null
      if (token) headers[TOKEN_HEADER] = token
      const response = await base(input, { ...init, headers })
      if (response.status === 401 && token) {
        if ((await errorCode(response)) === 'invalid_token')
          this.invalidate(token)
      }
      return response
    }
  }

  stop(): void {
    this.opts.window?.removeEventListener('storage', this.onStorage)
  }
}
