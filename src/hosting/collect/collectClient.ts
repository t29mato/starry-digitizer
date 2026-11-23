import { AuthSession, TOKEN_HEADER, errorCode } from './auth'
import { sha256Hex } from './sha256'
import {
  KeyValueStorage,
  browserStorage,
  loadClientId,
  loadUserChoice,
  randomUuid,
  saveUserChoice,
  storagePrefix,
  utf8Length,
} from './collectStorage'

export { utf8Length }

// INFO: The research collection of the starryai build: sends what the person
// does to the wpd-auto backend's `/collect/*` (backend/COLLECT.md, MIT), the
// same store and the same record shapes as the wpd-auto page, told apart by
// `X-WPD-App: starry-digitizer` (the records' `client`).
// docs/design/starryai-auto.md §3.4.
//
// HOST CODE, not library code: nothing under src/hosting is exported from
// the library entries, and the library itself never sends anything. Only the
// standalone app creates this, and only when its build names an auto service
// (VITE_AUTO_SERVICE_URL); the Vercel build names none.
//
// Order of things (each gate holds the events in the queue, none drops them):
//   1. `GET /collect/status` — off (404, enabled:false, unreachable): the
//      queue is dropped and nothing is ever sent.
//   2. the notice is on screen (markNoticeShown(), called by the page after
//      it rendered the notice) — nothing is sent before the person could see
//      that the work is saved for research.
//   3. a name is chosen, when the server has a list of names (or the page
//      is being closed: then what is left goes as Guest, as wpd-auto does).
//      With passwords (auth.ts, `login: password`): signed in, or Guest
//      chosen. Events are stamped with the person signed in when they
//      happened and go only with that person's token.

export const APP_HEADER = 'X-WPD-App'
export const APP_NAME = 'starry-digitizer'

export type CollectState = 'starting' | 'off' | 'on'

export interface CollectUser {
  id: string
  name: string
}

export interface CollectAppInfo {
  /** the deployed commit (hex), null for a local build */
  commit: string | null
  /** package.json's version (SemVer), null when not one */
  version: string | null
  /** the deploy's build number, null for a local build */
  build: number | null
}

export interface CollectClientOptions {
  /** the auto service's base URL, e.g. `/wpd-auto/api/v1` */
  baseUrl: string
  app: CollectAppInfo
  fetch?: typeof fetch
  /** default: localStorage (null = nothing is kept) */
  storage?: KeyValueStorage | null
  now?: () => number
  makeId?: () => string
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (timer: unknown) => void
  /** wait this long after an event before sending (more come together) */
  batchDelayMs?: number
  warn?: (message: string) => void
  /** the login (auth.ts); none = today's name labels only */
  auth?: AuthSession | null
}

export interface CollectEvent {
  type: string
  t: number
  seq: number
  data: Record<string, unknown>
}

interface QueuedEvent {
  event: CollectEvent
  /** the name it is sent under; undefined = not chosen yet */
  user: string | null | undefined
  bytes: number
  inFlight: boolean
}

interface ImageJob {
  sha256: string
  bytes: Uint8Array
  type: string
  tries: number
}

export const MAX_BATCH_EVENTS = 500
export const MAX_QUEUED_EVENTS = 2000
// INFO: a browser lets all keepalive requests in flight together carry 64 KiB;
// wpd-auto keeps under 60 000 bytes for the same reason
export const KEEPALIVE_BYTES = 60000
const FIRST_RETRY_MS = 2000
const MAX_RETRY_MS = 120000
const MAX_IMAGE_TRIES = 5
// INFO: what the server answers when the request itself is wrong; sending it
// again would only be refused again (COLLECT.md "送り方")
const DROP_STATUSES = [400, 413, 415]
const TYPE_RE = /^[a-z][a-z0-9_.]{0,63}$/

export class CollectClient {
  state: CollectState = 'starting'
  environment: string | null = null
  clientId: string | null = null
  readonly sessionId: string
  maxImageBytes = 10 * 1024 * 1024
  maxJsonBytes = 5 * 1024 * 1024
  /** the server's list of names; null = no names (everyone is Guest) */
  users: CollectUser[] | null = null
  guestAllowed = true
  /** the chosen name: an id, null = Guest, undefined = not chosen yet */
  user: string | null | undefined = undefined
  noticeShown = false

  /** password mode: Guest was chosen in the login dialog (this page only) */
  guestChosen = false

  private readonly opts: Required<
    Omit<CollectClientOptions, 'storage' | 'fetch' | 'auth'>
  > & { fetch: typeof fetch; storage: KeyValueStorage | null }
  /** the login (auth.ts); null = name labels only */
  readonly auth: AuthSession | null
  private prefix = storagePrefix(null)
  private queue: QueuedEvent[] = []
  private seq = 0
  private sending = false
  private batchTimer: unknown = null
  private retryTimer: unknown = null
  private failures = 0
  private retryAfterMs = 0
  private images: ImageJob[] = []
  private imagesSeen = new Set<string>()
  private imageBusy = false
  private warned = new Set<string>()
  private listeners = new Set<() => void>()
  private stopped = false

  constructor(options: CollectClientOptions) {
    this.opts = {
      batchDelayMs: 4000,
      now: () => Date.now(),
      makeId: () => randomUuid(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (timer) => clearTimeout(timer as number),
      warn: (message) => console.warn(`[starry-digitizer] ${message}`),
      ...options,
      baseUrl: options.baseUrl.replace(/\/+$/, ''),
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      storage:
        options.storage === undefined ? browserStorage() : options.storage,
    }
    this.sessionId = this.opts.makeId()
    this.auth = options.auth ?? null
    this.auth?.subscribe(() => this.authChanged())
  }

  /** The server decides the person by a password login (auth.ts). */
  get passwordMode(): boolean {
    return this.auth?.passwordMode === true
  }

  // --- state ---------------------------------------------------------------

  /** Called whenever state, user, or the users list changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    this.listeners.forEach((listener) => listener())
  }

  /** The server keeps a list of names and none is chosen yet. */
  get needsUserChoice(): boolean {
    if (this.passwordMode) return false
    return this.state === 'on' && this.users !== null && this.user === undefined
  }

  /** The chosen name's display name, null for Guest / no names. */
  get userName(): string | null {
    if (this.passwordMode) return this.auth?.user?.name ?? null
    if (!this.user || !this.users) return null
    return this.users.find((u) => u.id === this.user)?.name ?? this.user
  }

  /** Whether events may leave the page now (gates 1–2 above). */
  get canSend(): boolean {
    return this.state === 'on' && this.noticeShown && !this.stopped
  }

  /**
   * Ask the server whether it collects, and for its names. Never rejects:
   * anything but a clear "enabled" is "off".
   */
  async start(): Promise<CollectState> {
    let status: Record<string, unknown> | null = null
    try {
      const response = await this.opts.fetch(
        `${this.opts.baseUrl}/collect/status`,
        {
          method: 'GET',
          headers: { [APP_HEADER]: APP_NAME },
          credentials: 'same-origin',
        },
      )
      if (response.ok)
        status = (await response.json()) as Record<string, unknown>
    } catch {
      status = null
    }
    this.environment =
      typeof status?.environment === 'string' ? status.environment : null
    // INFO: asked even when nothing is collected: the auto service's
    // requests need the token all the same
    await this.auth?.start(this.environment)
    if (!status || status.enabled !== true) {
      this.turnOff()
      return this.state
    }
    this.prefix = storagePrefix(this.environment)
    if (isPositiveInt(status.max_image_bytes))
      this.maxImageBytes = status.max_image_bytes
    if (isPositiveInt(status.max_json_bytes))
      this.maxJsonBytes = status.max_json_bytes
    this.clientId = loadClientId(
      this.opts.storage,
      this.prefix,
      this.opts.makeId,
    )
    await this.loadUsers()
    this.assignUser()
    this.state = 'on'
    this.changed()
    this.schedule()
    this.processImages()
    return this.state
  }

  private turnOff(): void {
    this.state = 'off'
    this.queue = []
    this.images = []
    this.changed()
  }

  private async loadUsers(): Promise<void> {
    let body: Record<string, unknown> | null = null
    try {
      const response = await this.opts.fetch(
        `${this.opts.baseUrl}/collect/users`,
        {
          method: 'GET',
          headers: { [APP_HEADER]: APP_NAME },
          credentials: 'same-origin',
        },
      )
      if (response.ok) body = (await response.json()) as Record<string, unknown>
    } catch {
      body = null
    }
    const list = Array.isArray(body?.users)
      ? (body?.users as unknown[]).filter(isUser)
      : []
    if (this.passwordMode) {
      // INFO: the list only offers the names in the login dialog (none =
      // the name is typed); who it is comes from the token alone
      this.users = list.map(({ id, name }) => ({ id, name }))
      this.guestAllowed = this.auth?.guestAllowed !== false
      this.user = this.auth?.user?.id
      return
    }
    // INFO: no list (or none could be read): no names, everyone is Guest —
    // the page asks nothing (COLLECT.md "利用者の名前")
    if (body?.enabled !== true || list.length === 0) {
      this.users = null
      this.user = null
      return
    }
    this.users = list.map(({ id, name }) => ({ id, name }))
    this.guestAllowed = body.guest !== false
    const kept = loadUserChoice(this.opts.storage, this.prefix)
    // INFO: a name taken off the list (or Guest switched off) is asked again
    this.user =
      kept === null
        ? this.guestAllowed
          ? null
          : undefined
        : kept !== undefined && list.some((u) => u.id === kept)
        ? kept
        : undefined
  }

  /** The page rendered the notice; sending may begin. */
  markNoticeShown(): void {
    if (this.noticeShown) return
    this.noticeShown = true
    this.schedule()
    this.processImages()
  }

  /**
   * The person picked a name (id) or Guest (null). Events recorded before
   * go under this name; on a change, the earlier ones keep the old one.
   */
  chooseUser(user: string | null): void {
    if (this.passwordMode) {
      // INFO: with passwords only Guest is chosen here; a name needs login()
      if (user !== null || !this.guestAllowed) return
      this.guestChosen = true
      this.authChanged()
      return
    }
    if (user === null && !this.guestAllowed) return
    if (user !== null && !this.users?.some((u) => u.id === user)) return
    const previous = this.user
    this.user = user
    saveUserChoice(this.opts.storage, this.prefix, user)
    this.assignUser()
    if (previous !== undefined && previous !== user) {
      this.record('user.changed', {
        guest: user === null,
        was_guest: previous === null,
      })
    }
    this.changed()
    this.schedule(0)
    void this.processImages()
  }

  /**
   * Password mode: the person signed in or out (here or on the other page),
   * or the token was refused. Events of the person who is gone and not sent
   * yet wait again, like events before any choice, and go under whoever
   * signs in next (or Guest) — they are never sent with someone else's token.
   */
  private authChanged(): void {
    if (!this.passwordMode) return
    const signedIn = this.auth?.user?.id
    if (signedIn !== undefined) this.guestChosen = false
    const next = signedIn ?? (this.guestChosen ? null : undefined)
    const previous = this.user
    if (next === previous) {
      this.changed()
      return
    }
    if (typeof previous === 'string') {
      this.queue.forEach((item) => {
        if (item.user === previous && !item.inFlight) item.user = undefined
      })
    }
    this.user = next
    this.assignUser()
    if (previous !== undefined && next !== undefined) {
      this.record('user.changed', {
        guest: next === null,
        was_guest: previous === null,
      })
    }
    this.changed()
    if (this.state === 'on') {
      this.schedule(0)
      void this.processImages()
    }
  }

  // INFO: the events recorded before the name was known go under it
  private assignUser(): void {
    const user = this.user
    if (user === undefined) return
    this.queue.forEach((item) => {
      if (item.user === undefined) item.user = user
    })
  }

  /** Stop for good (the page goes away); what is queued is not sent. */
  stop(): void {
    this.stopped = true
    if (this.batchTimer !== null) this.opts.clearTimer(this.batchTimer)
    if (this.retryTimer !== null) this.opts.clearTimer(this.retryTimer)
    this.batchTimer = null
    this.retryTimer = null
    this.auth?.stop()
  }

  // --- headers -------------------------------------------------------------

  /**
   * The headers of a request from this page. `X-WPD-App` always (every
   * request, so the server's own `server.*` records name the page); the ids
   * and the name only once sending is allowed, so nothing ties a request to
   * this browser before the notice was shown.
   */
  headers(user: string | null | undefined = this.user): Record<string, string> {
    const headers: Record<string, string> = { [APP_HEADER]: APP_NAME }
    if (!this.canSend || !this.clientId) return headers
    headers['X-WPD-Client-Id'] = this.clientId
    headers['X-WPD-Session-Id'] = this.sessionId
    if (this.passwordMode) {
      // INFO: the server ignores X-WPD-User here; the token alone names the
      // person, and only the token of the person the events belong to
      const token = this.tokenFor(user)
      if (token) headers[TOKEN_HEADER] = token
    } else if (typeof user === 'string') headers['X-WPD-User'] = user
    return headers
  }

  private tokenFor(user: string | null | undefined): string | null {
    if (typeof user !== 'string' || this.auth?.user?.id !== user) return null
    return this.auth.token()
  }

  // --- events --------------------------------------------------------------

  /** Queue an event. Dropped when collection is off. */
  record(type: string, data: Record<string, unknown> = {}): void {
    if (this.state === 'off' || this.stopped) return
    if (!TYPE_RE.test(type) || type.startsWith('server.')) {
      this.warnOnce('type', `research event type not sent: ${type}`)
      return
    }
    this.seq += 1
    const event: CollectEvent = {
      type,
      t: this.opts.now(),
      seq: this.seq,
      data,
    }
    let bytes: number
    try {
      bytes = utf8Length(JSON.stringify(event))
    } catch {
      this.warnOnce('json', `research event not sent: ${type}`)
      return
    }
    this.queue.push({ event, user: this.user, bytes, inFlight: false })
    if (this.queue.length > MAX_QUEUED_EVENTS) {
      // INFO: the oldest go first; a page that cannot reach the server for
      // hours must not grow without bound
      const drop = this.queue.findIndex((item) => !item.inFlight)
      if (drop >= 0) this.queue.splice(drop, 1)
      this.warnOnce('overflow', 'research events dropped: the queue is full')
    }
    this.schedule()
  }

  /** Events waiting to be sent (for tests and the status line). */
  get pending(): number {
    return this.queue.length
  }

  private schedule(delay = this.opts.batchDelayMs): void {
    if (!this.canSend || this.retryTimer !== null) return
    if (this.batchTimer !== null) {
      if (delay > 0) return
      this.opts.clearTimer(this.batchTimer)
    }
    this.batchTimer = this.opts.setTimer(() => {
      this.batchTimer = null
      void this.flush()
    }, delay)
  }

  private nextBatch(limitBytes: number, asGuest: boolean): QueuedEvent[] {
    const batch: QueuedEvent[] = []
    let bytes = 200
    let user: string | null | undefined
    for (const item of this.queue) {
      if (item.inFlight) continue
      const itemUser = item.user === undefined && asGuest ? null : item.user
      if (itemUser === undefined) break
      if (batch.length === 0) user = itemUser
      else if (itemUser !== user) break
      if (batch.length >= MAX_BATCH_EVENTS) break
      if (batch.length > 0 && bytes + item.bytes + 1 > limitBytes) break
      batch.push(item)
      bytes += item.bytes + 1
    }
    return batch
  }

  /**
   * Send what may be sent now, batch by batch. Resolves when done or when
   * a failure has scheduled a retry. Never rejects.
   */
  async flush(): Promise<void> {
    if (!this.canSend || this.sending) return
    this.sending = true
    try {
      for (;;) {
        const batch = this.nextBatch(Math.floor(this.maxJsonBytes / 2), false)
        if (batch.length === 0) break
        const outcome = await this.send(batch, false)
        if (outcome === 'held') break
        if (outcome === 'retry') {
          this.retryLater()
          break
        }
        this.failures = 0
      }
    } finally {
      this.sending = false
    }
  }

  /**
   * The tab was hidden or is being closed: send what fits in a keepalive
   * request now (unchosen names as Guest). What does not fit stays queued.
   */
  flushOnHide(): void {
    if (!this.canSend) return
    if (this.batchTimer !== null) {
      this.opts.clearTimer(this.batchTimer)
      this.batchTimer = null
    }
    const batch = this.nextBatch(KEEPALIVE_BYTES, true)
    if (batch.length === 0) return
    if (batch.length === 1 && batch[0].bytes + 200 > KEEPALIVE_BYTES) return
    void this.send(batch, true)
  }

  private async send(
    batch: QueuedEvent[],
    keepalive: boolean,
  ): Promise<'ok' | 'dropped' | 'retry' | 'held'> {
    const user = batch[0].user ?? null
    const token = this.passwordMode ? this.tokenFor(user) : null
    if (this.passwordMode && typeof user === 'string' && !token) {
      // INFO: that person's token is gone (expired just now): the events
      // wait for the next sign-in instead of going as Guest
      batch.forEach((item) => (item.user = undefined))
      this.assignUser()
      return 'held'
    }
    batch.forEach((item) => (item.inFlight = true))
    const body = JSON.stringify({
      client_id: this.clientId,
      session_id: this.sessionId,
      app_commit: this.opts.app.commit,
      app_version: this.opts.app.version,
      app_build: this.opts.app.build,
      events: batch.map((item) => item.event),
    })
    let status = 0
    let retryAfter = 0
    let code: string | undefined
    try {
      const response = await this.opts.fetch(
        `${this.opts.baseUrl}/collect/events`,
        {
          method: 'POST',
          headers: {
            ...this.headers(user),
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body,
          keepalive,
        },
      )
      status = response.status
      retryAfter = Number(response.headers?.get?.('Retry-After')) || 0
      if (status === 401) code = await errorCode(response)
    } catch {
      status = 0
    }
    batch.forEach((item) => (item.inFlight = false))
    if (status === 401 && code === 'invalid_token' && token) {
      // INFO: the events stay; dropping the token re-gates them until the
      // person signs in again (or chooses Guest)
      this.auth?.invalidate(token)
      return 'held'
    }
    if (status >= 200 && status < 300) {
      this.remove(batch)
      return 'ok'
    }
    if (DROP_STATUSES.includes(status)) {
      this.remove(batch)
      this.warnOnce(
        `http-${status}`,
        `research events refused (HTTP ${status})`,
      )
      return 'dropped'
    }
    if (status === 404) {
      // INFO: collection was switched off on the server since status said on
      this.turnOff()
      return 'dropped'
    }
    this.warnOnce(
      'retry',
      `research events not sent yet (HTTP ${
        status || 'unreachable'
      }); retrying`,
    )
    this.retryAfterMs = retryAfter * 1000
    return 'retry'
  }

  private retryLater(): void {
    this.failures += 1
    const backoff = Math.min(
      FIRST_RETRY_MS * 2 ** (this.failures - 1),
      MAX_RETRY_MS,
    )
    const delay = Math.max(backoff, this.retryAfterMs)
    this.retryAfterMs = 0
    if (this.retryTimer !== null) this.opts.clearTimer(this.retryTimer)
    this.retryTimer = this.opts.setTimer(() => {
      this.retryTimer = null
      void this.flush()
    }, delay)
  }

  private remove(batch: QueuedEvent[]): void {
    const sent = new Set(batch)
    this.queue = this.queue.filter((item) => !sent.has(item))
  }

  // --- images --------------------------------------------------------------

  /**
   * An image was loaded: record `image` (once per sha256 per page) and send
   * its bytes to the image store unless the server has them. Above the
   * server's limit, `image.not_sent` instead. Returns the sha256.
   */
  addImage(
    bytes: Uint8Array,
    meta: {
      type: string
      name?: string | null
      width?: number
      height?: number
    },
  ): string | null {
    if (this.state === 'off' || this.stopped) return null
    const sha256 = sha256Hex(bytes)
    if (this.imagesSeen.has(sha256)) return sha256
    this.imagesSeen.add(sha256)
    const tooLarge = bytes.length > this.maxImageBytes
    this.record('image', {
      sha256,
      size: bytes.length,
      type: meta.type,
      name: meta.name ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
    })
    if (tooLarge) {
      this.record('image.not_sent', { sha256, size: bytes.length })
      return sha256
    }
    this.images.push({ sha256, bytes, type: meta.type, tries: 0 })
    this.processImages()
    return sha256
  }

  /** Images waiting to be sent (for tests). */
  get pendingImages(): number {
    return this.images.length
  }

  private async processImages(): Promise<void> {
    // INFO: the stored image's record (`server.image`) carries the name too
    if (!this.canSend || this.imageBusy || this.user === undefined) return
    const job = this.images[0]
    if (!job) return
    this.imageBusy = true
    let done: boolean | 'held' = false
    try {
      done = await this.sendImage(job)
    } finally {
      this.imageBusy = false
    }
    // INFO: the token was refused: the image waits for the next sign-in
    // (processImages() runs again when the person changes)
    if (done === 'held') return
    if (done) {
      this.images.shift()
      void this.processImages()
      return
    }
    job.tries += 1
    if (job.tries >= MAX_IMAGE_TRIES) {
      this.images.shift()
      this.warnOnce('image', 'an image could not be sent for research')
      void this.processImages()
      return
    }
    this.opts.setTimer(
      () => void this.processImages(),
      Math.min(FIRST_RETRY_MS * 2 ** (job.tries - 1), MAX_RETRY_MS),
    )
  }

  // INFO: true = finished with this image (stored, already there, or refused
  // for good); false = try again later; 'held' = the token was refused
  private async sendImage(job: ImageJob): Promise<boolean | 'held'> {
    const url = `${this.opts.baseUrl}/collect/images/${job.sha256}`
    const headers = this.headers()
    const token = headers[TOKEN_HEADER]
    if (this.passwordMode && typeof this.user === 'string' && !token)
      return 'held'
    const refused = async (response: Response) => {
      if (response.status !== 401 || !token) return false
      if ((await errorCode(response)) !== 'invalid_token') return false
      this.auth?.invalidate(token)
      return true
    }
    try {
      const has = await this.opts.fetch(url, {
        method: 'GET',
        headers,
        credentials: 'same-origin',
      })
      if (await refused(has)) return 'held'
      if (has.ok) {
        const body = (await has.json()) as { exists?: unknown }
        if (body.exists === true) return true
      } else if (DROP_STATUSES.includes(has.status) || has.status === 404) {
        return true
      }
      const query = new URLSearchParams({
        client_id: this.clientId ?? '',
        session_id: this.sessionId,
      })
      const put = await this.opts.fetch(`${url}?${query.toString()}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': job.type || 'application/octet-stream',
        },
        credentials: 'same-origin',
        body: job.bytes,
      })
      if (await refused(put)) return 'held'
      if (put.ok) return true
      if (DROP_STATUSES.includes(put.status) || put.status === 404) {
        this.warnOnce(
          `image-${put.status}`,
          `image refused (HTTP ${put.status})`,
        )
        return true
      }
      return false
    } catch {
      return false
    }
  }

  private warnOnce(kind: string, message: string): void {
    if (this.warned.has(kind)) return
    this.warned.add(kind)
    this.opts.warn(message)
  }
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isUser(value: unknown): value is CollectUser {
  const v = value as CollectUser
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    typeof v.name === 'string'
  )
}
