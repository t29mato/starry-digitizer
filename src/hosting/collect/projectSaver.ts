import type { ProjectDTO } from '@/application/dto/projectDTO'
import type { CollectAppInfo, CollectClient } from './collectClient'
import {
  KeyValueStorage,
  browserStorage,
  isUuid,
  randomUuid,
  readItem,
  storagePrefix,
  utf8Length,
  writeItem,
} from './collectStorage'
import type { CurrentImage } from './collectWiring'

// INFO: saves the work on the server (`POST /collect/project`, the format
// `starry-digitizer/project` of wpd-auto's draft docs/starry-digitizer-
// projects.md 0.0.1), so the person can open it again from My work
// (myWork.ts). docs/design/starryai-auto.md §3.2(c), §3.4.
//
// HOST CODE like the rest of src/hosting/collect. The browser's own
// auto-save (IndexedDB, appPersistence.ts) stays as it is; this is a second
// copy, on the server.
//
// One work = one `project_id` (a UUID) = one image (sha256) of one person:
// - a new image, or another person signed in / chosen → a new work;
// - opened from My work → that work's id, kept while its image is on screen;
// - Start over (keep image) keeps the image, so it keeps the work;
//   File > Start Over (image discarded) starts a new one (newWork());
// - after a reload, the work restored from the browser continues the same id
//   (kept in localStorage per environment, with its image and person).
//
// When: 3 s after a change, at most once every 15 s, and at once (keepalive)
// when the tab is hidden or closed. Nothing is sent when nothing changed, nor
// before the notice was shown and a name (or Guest) is chosen — the gates of
// CollectClient.

export const PROJECT_FORMAT = 'starry-digitizer/project'
export const SAVE_DELAY_MS = 3000
export const SAVE_INTERVAL_MS = 15000
const FIRST_RETRY_MS = 2000
const MAX_RETRY_MS = 120000
const MAX_CONFLICTS = 3
// INFO: the server cannot take this request, and sending it again would
// only be refused again
const REFUSED_STATUSES = [400, 413, 415]

/**
 * - `idle`: nothing saved yet on this page (or nothing to save)
 * - `saved`: the work on screen is on the server
 * - `retrying`: a save failed (network, 5xx, 429…) and is tried again
 * - `refused`: the server refused this state of the work (too large…)
 * - `unsupported`: the server does not take this format (an older backend):
 *   no project is sent for the rest of the page; the events still are
 * - `off`: collection is off
 */
export type SaveState =
  | 'idle'
  | 'saved'
  | 'retrying'
  | 'refused'
  | 'unsupported'
  | 'off'

export interface SaveView {
  state: SaveState
  /** when the server last stored this page's work (ms), null = never */
  savedAt: number | null
}

export type SaverClient = Pick<
  CollectClient,
  | 'state'
  | 'canSend'
  | 'user'
  | 'clientId'
  | 'sessionId'
  | 'environment'
  | 'maxJsonBytes'
  | 'headers'
  | 'subscribe'
  | 'nextSeq'
  | 'passwordMode'
> & { auth: Pick<NonNullable<CollectClient['auth']>, 'invalidate'> | null }

export interface ProjectSaverOptions {
  /** the auto service's base URL, e.g. `/wpd-auto/api/v1` */
  baseUrl: string
  app: CollectAppInfo
  client: SaverClient
  /** the work on screen */
  getProject(): ProjectDTO | null
  /** the image on screen */
  getImage(): CurrentImage | null
  fetch?: typeof fetch
  /** default: localStorage (null = nothing is kept) */
  storage?: KeyValueStorage | null
  now?: () => number
  makeId?: () => string
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (timer: unknown) => void
  delayMs?: number
  intervalMs?: number
  onChange?: (view: SaveView) => void
  warn?: (message: string) => void
}

interface Binding {
  projectId: string
  sha256: string
  /** the person the work belongs to: an id, null = Guest */
  user: string | null
}

interface Built {
  body: string
  bytes: number
  key: string
  projectId: string
  user: string | null
}

/** Whether a project holds any work (an axis point or a data point). */
export function projectHasWork(project: ProjectDTO | null): boolean {
  if (!project) return false
  if (project.datasets.some((dataset) => dataset.points.length > 0)) return true
  // INFO: an axis point not placed yet sits at (-999, -999)
  // (createEmptyProject)
  return project.axisSets.some((axisSet) =>
    [axisSet.x1, axisSet.x2, axisSet.y1, axisSet.y2].some(
      (axis) => axis.coord.xPx !== -999 || axis.coord.yPx !== -999,
    ),
  )
}

export class ProjectSaver {
  view: SaveView = { state: 'idle', savedAt: null }

  private readonly opts: Required<
    Omit<ProjectSaverOptions, 'storage' | 'fetch' | 'onChange'>
  > & {
    fetch: typeof fetch
    storage: KeyValueStorage | null
    onChange: (view: SaveView) => void
  }
  private binding: Binding | null = null
  /** the stored binding may be taken up (false after newWork()) */
  private mayResume = true
  /** what was last stored (or refused) for the bound work */
  private lastKey: string | null = null
  private lastSentAt = -Infinity
  private dirty = false
  private sending = false
  private timer: unknown = null
  private retryTimer: unknown = null
  private failures = 0
  private conflicts = 0
  private opening = false
  private stopped = false
  private unsubscribe: () => void

  constructor(options: ProjectSaverOptions) {
    this.opts = {
      now: () => Date.now(),
      makeId: () => randomUuid(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (timer) => clearTimeout(timer as number),
      delayMs: SAVE_DELAY_MS,
      intervalMs: SAVE_INTERVAL_MS,
      warn: (message) => console.warn(`[starry-digitizer] ${message}`),
      ...options,
      baseUrl: options.baseUrl.replace(/\/+$/, ''),
      fetch: options.fetch ?? ((input, init) => fetch(input, init)),
      storage:
        options.storage === undefined ? browserStorage() : options.storage,
      onChange: options.onChange ?? (() => undefined),
    }
    // INFO: a gate opened (notice shown, name chosen, signed in again): a
    // change that waited goes now (within the interval)
    this.unsubscribe = this.opts.client.subscribe(() => this.clientChanged())
  }

  /** The project id the next save goes to; null before the first. */
  get projectId(): string | null {
    return this.binding?.projectId ?? null
  }

  private get blocked(): boolean {
    const state = this.view.state
    return this.stopped || state === 'unsupported' || state === 'off'
  }

  /** The work on screen changed. */
  changed(): void {
    if (this.blocked) return
    this.dirty = true
    this.schedule()
  }

  private schedule(): void {
    if (this.blocked || !this.dirty || this.sending) return
    if (this.timer !== null || this.retryTimer !== null) return
    const now = this.opts.now()
    const delay = Math.max(
      this.opts.delayMs,
      this.lastSentAt + this.opts.intervalMs - now,
    )
    this.timer = this.opts.setTimer(() => {
      this.timer = null
      void this.save()
    }, delay)
  }

  private clientChanged(): void {
    if (this.opts.client.state === 'off') {
      this.setState('off')
      return
    }
    this.schedule()
  }

  /**
   * Send the work now unless it is already on the server (Open from My
   * work saves the current work first). Resolves when done. Never rejects.
   */
  async save(): Promise<void> {
    if (this.timer !== null) {
      this.opts.clearTimer(this.timer)
      this.timer = null
    }
    if (this.blocked || this.sending || this.opening) return
    const built = this.build()
    if (!built) return
    this.dirty = false
    if (built.bytes > this.opts.client.maxJsonBytes) {
      this.lastKey = built.key
      this.setState('refused')
      this.opts.warn('the work is too large to be saved on the server')
      return
    }
    this.sending = true
    let outcome: Outcome
    try {
      outcome = await this.post(built, false)
    } finally {
      this.sending = false
    }
    this.handle(outcome, built)
  }

  /**
   * The tab is hidden or being closed (CollectClient.flushOnHide): send the
   * work at once, with keepalive if it fits in `budget` bytes. Returns the
   * keepalive bytes used.
   */
  flushOnHide(budget: number): number {
    if (this.blocked || this.opening) return 0
    if (this.timer !== null) {
      this.opts.clearTimer(this.timer)
      this.timer = null
    }
    const built = this.build()
    if (!built) return 0
    if (built.bytes > this.opts.client.maxJsonBytes) return 0
    this.dirty = false
    // INFO: a larger work goes as an ordinary request: it reaches the server
    // when the tab is only hidden, maybe not when it is closed
    const keepalive = built.bytes + 200 <= budget
    void this.post(built, keepalive).then((outcome) =>
      this.handle(outcome, built),
    )
    return keepalive ? built.bytes : 0
  }

  /**
   * The body to send now, or null when nothing is to be sent: a gate is
   * closed, no image, nothing changed, or an empty work not saved before.
   */
  private build(): Built | null {
    const client = this.opts.client
    if (!client.canSend || !client.clientId) return null
    // INFO: no name chosen yet: the work waits (it is not sent as Guest when
    // the tab closes, unlike the events — a Guest work would then belong to
    // someone else than the person who signs in next)
    const user = client.user
    if (user === undefined) return null
    const image = this.opts.getImage()
    const project = this.opts.getProject()
    if (!image || !project) return null
    const projectId = this.bind(image.sha256, user)
    const file = {
      index: 0,
      sha256: image.sha256,
      name: image.name,
      type: image.type,
      size: image.size,
    }
    // INFO: the timestamp changes on every snapshot; it is no change
    const key = JSON.stringify([
      projectId,
      file,
      { ...project, timestamp: undefined },
    ])
    if (key === this.lastKey) return null
    if (this.lastKey === null && !projectHasWork(project)) return null
    const body = JSON.stringify({
      client_id: client.clientId,
      session_id: client.sessionId,
      app_commit: this.opts.app.commit,
      app_version: this.opts.app.version,
      app_build: this.opts.app.build,
      project_id: projectId,
      t: this.opts.now(),
      seq: client.nextSeq(),
      format: PROJECT_FORMAT,
      project_json: JSON.stringify(project),
      data: { files: [file], view: { file_index: 0 } },
    })
    return { body, bytes: utf8Length(body), key, projectId, user }
  }

  private bind(sha256: string, user: string | null): string {
    const bound = this.binding
    if (bound && bound.sha256 === sha256 && bound.user === user)
      return bound.projectId
    const kept = this.mayResume && !bound ? this.readKept() : null
    this.binding =
      kept && kept.sha256 === sha256 && kept.user === user
        ? kept
        : { projectId: this.opts.makeId(), sha256, user }
    this.mayResume = false
    this.lastKey = null
    this.keep()
    return this.binding.projectId
  }

  private async post(built: Built, keepalive: boolean): Promise<Outcome> {
    const headers = this.opts.client.headers(built.user)
    const token = headers['X-WPD-Token']
    // INFO: that person's token is gone (signed out, expired): the work
    // waits for the next sign-in
    if (this.opts.client.passwordMode && typeof built.user === 'string')
      if (!token) return { kind: 'held' }
    try {
      const response = await this.opts.fetch(
        `${this.opts.baseUrl}/collect/project`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: built.body,
          keepalive,
        },
      )
      const status = response.status
      if (status >= 200 && status < 300) return { kind: 'ok' }
      let code: string | undefined
      let detail = ''
      if (status === 400 || status === 401 || status === 409) {
        const body = await readError(response)
        code = body.error
        detail = body.detail
      }
      if (status === 401 && code === 'invalid_token' && token) {
        this.opts.client.auth?.invalidate(token)
        return { kind: 'held' }
      }
      if (status === 409) return { kind: 'conflict' }
      if (status === 400 && isUnknownFormat(code, detail))
        return { kind: 'unsupported' }
      if (REFUSED_STATUSES.includes(status)) return { kind: 'refused', status }
      if (status === 404) return { kind: 'off' }
      const retryAfter = Number(response.headers?.get?.('Retry-After')) || 0
      return { kind: 'retry', retryAfterMs: retryAfter * 1000 }
    } catch {
      return { kind: 'retry', retryAfterMs: 0 }
    }
  }

  private handle(outcome: Outcome, built: Built): void {
    if (this.stopped) return
    const stale = this.binding?.projectId !== built.projectId
    switch (outcome.kind) {
      case 'ok':
        this.failures = 0
        this.conflicts = 0
        this.lastSentAt = this.opts.now()
        if (!stale) this.lastKey = built.key
        this.view = { state: 'saved', savedAt: this.opts.now() }
        this.opts.onChange(this.view)
        break
      case 'conflict':
        // INFO: the id is someone else's work (another person, another
        // browser, or another format): this becomes a new work, sent at once
        this.conflicts += 1
        if (this.conflicts > MAX_CONFLICTS) {
          this.setState('refused')
          this.opts.warn('the work was not saved on the server (conflict)')
          return
        }
        if (!stale && this.binding) {
          this.binding = { ...this.binding, projectId: this.opts.makeId() }
          this.lastKey = null
          this.keep()
        }
        this.dirty = true
        this.timer = this.opts.setTimer(() => {
          this.timer = null
          void this.save()
        }, 0)
        return
      case 'unsupported':
        // INFO: an older backend (no `format`): quietly no projects for the
        // rest of the page; the events still go
        this.setState('unsupported')
        return
      case 'refused':
        if (!stale) this.lastKey = built.key
        this.setState('refused')
        this.opts.warn(
          `the work was not saved on the server (HTTP ${outcome.status})`,
        )
        break
      case 'off':
        this.setState('off')
        return
      case 'held':
        this.dirty = true
        return
      case 'retry':
        this.dirty = true
        this.retryLater(outcome.retryAfterMs)
        return
    }
    // INFO: changes made while this one was in flight
    this.schedule()
  }

  private retryLater(retryAfterMs: number): void {
    this.failures += 1
    this.setState('retrying')
    const backoff = Math.min(
      FIRST_RETRY_MS * 2 ** (this.failures - 1),
      MAX_RETRY_MS,
    )
    if (this.retryTimer !== null) this.opts.clearTimer(this.retryTimer)
    this.retryTimer = this.opts.setTimer(
      () => {
        this.retryTimer = null
        this.dirty = true
        void this.save()
      },
      Math.max(backoff, retryAfterMs),
    )
  }

  private setState(state: SaveState): void {
    if (this.view.state === state) return
    this.view = { ...this.view, state }
    if (state === 'unsupported' || state === 'off') this.cancelTimers()
    this.opts.onChange(this.view)
  }

  private cancelTimers(): void {
    if (this.timer !== null) this.opts.clearTimer(this.timer)
    if (this.retryTimer !== null) this.opts.clearTimer(this.retryTimer)
    this.timer = null
    this.retryTimer = null
  }

  // --- the work's identity ---------------------------------------------------

  /** File > Start Over: what comes next is a new work. */
  newWork(): void {
    this.binding = null
    this.mayResume = false
    this.lastKey = null
    writeItem(this.opts.storage, this.storageKey, '')
  }

  /** My work's Open has begun: nothing is saved until it ends. */
  beginOpen(): void {
    this.opening = true
    this.cancelTimers()
  }

  /**
   * My work's Open restored `projectId` (its image `sha256`): later saves
   * continue that work. The state on screen now counts as saved.
   */
  continueWork(projectId: string, sha256: string): void {
    this.opening = false
    // INFO: the restore did not put that image on screen (the digitizer
    // reports a failed load as an error, it does not throw): what is on
    // screen stays a work of its own
    if (this.opts.getImage()?.sha256 !== sha256) {
      this.changed()
      return
    }
    const user = this.opts.client.user
    this.binding = { projectId, sha256, user: user ?? null }
    this.mayResume = false
    this.keep()
    this.lastKey = null
    const built = this.build()
    // INFO: build() returns null when the key is unchanged; lastKey is then
    // already right
    if (built) this.lastKey = built.key
    this.dirty = false
    this.failures = 0
    this.conflicts = 0
    this.view = { state: 'saved', savedAt: this.view.savedAt }
    this.opts.onChange(this.view)
  }

  /** My work's Open failed: saving goes on as before. */
  endOpen(): void {
    this.opening = false
    this.schedule()
  }

  private get storageKey(): string {
    return `${storagePrefix(this.opts.client.environment)}project`
  }

  private readKept(): Binding | null {
    try {
      const kept = JSON.parse(
        readItem(this.opts.storage, this.storageKey) ?? 'null',
      ) as Record<string, unknown> | null
      if (
        kept &&
        isUuid(kept.project_id) &&
        typeof kept.sha256 === 'string' &&
        (kept.user === null || typeof kept.user === 'string')
      )
        return {
          projectId: kept.project_id,
          sha256: kept.sha256,
          user: kept.user,
        }
    } catch {
      // INFO: unreadable: a new work
    }
    return null
  }

  private keep(): void {
    const bound = this.binding
    if (!bound) return
    writeItem(
      this.opts.storage,
      this.storageKey,
      JSON.stringify({
        project_id: bound.projectId,
        sha256: bound.sha256,
        user: bound.user,
      }),
    )
  }

  stop(): void {
    this.stopped = true
    this.cancelTimers()
    this.unsubscribe()
  }
}

type Outcome =
  | { kind: 'ok' }
  | { kind: 'conflict' }
  | { kind: 'unsupported' }
  | { kind: 'refused'; status: number }
  | { kind: 'off' }
  | { kind: 'held' }
  | { kind: 'retry'; retryAfterMs: number }

// INFO: the backend's error body: {"error": <code>, "detail": <text>}
async function readError(
  response: Response,
): Promise<{ error?: string; detail: string }> {
  try {
    const source =
      typeof response.clone === 'function' ? response.clone() : response
    const body = (await source.json()) as { error?: unknown; detail?: unknown }
    return {
      error: typeof body?.error === 'string' ? body.error : undefined,
      detail: typeof body?.detail === 'string' ? body.detail : '',
    }
  } catch {
    return { detail: '' }
  }
}

// INFO: a backend without the format answers 400 invalid_params about
// `wpd_json` (it requires it: collect.py today); one with formats but not
// this one would name `format`
export function isUnknownFormat(
  code: string | undefined,
  detail: string,
): boolean {
  return code === 'invalid_params' && /wpd_json|format/i.test(detail)
}

/** "12:34", the page's local time. */
export function clockTime(ms: number): string {
  const date = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** The footer line of the save on the server; null = nothing to show. */
export function saveStatusText(
  view: SaveView,
  time: (ms: number) => string = clockTime,
): string | null {
  const last =
    view.savedAt === null ? '' : ` (last saved ${time(view.savedAt)})`
  switch (view.state) {
    case 'saved':
      return view.savedAt === null
        ? null
        : `Saved on the server ${time(view.savedAt)}`
    case 'retrying':
      return `Not saved yet — retrying${last}`
    case 'refused':
      return `Not saved: the server refused the work${last}`
    default:
      // INFO: idle, off, and an older backend (unsupported): nothing — the
      // browser's own auto-save still keeps the work
      return null
  }
}
