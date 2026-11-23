import { migrateProject, type ProjectDTO } from '@/application/dto/projectDTO'
import { PROJECT_FORMAT } from './projectSaver'
import { sha256Hex } from './sha256'
import { errorCode } from './auth'

// INFO: My work: the person's own works saved on the server
// (projectSaver.ts), listed and opened again. The routes are wpd-auto's
// (`GET /collect/works`, `/works/<id>`, `/works/<id>/images/<sha>`,
// `/works/<id>/thumbnail`; backend/COLLECT.md), with the format
// `starry-digitizer/project` of the draft docs/starry-digitizer-projects.md
// 0.0.1. Who may read what is the server's decision (the token with
// passwords; else the name, and for a Guest this browser's client id).
// docs/design/starryai-auto.md §3.2(c).

export const WORK_SORTS = ['saved', 'name', 'sid', 'figure'] as const
export type WorkSort = (typeof WORK_SORTS)[number]
/** works per page of the list (the server takes 1..200) */
export const WORKS_PAGE = 50

export interface WorkFile {
  index: number
  sha256: string
  name: string | null
  type: string | null
  size: number | null
}

export interface WorkItem {
  projectId: string
  createdAt: string | null
  updatedAt: string | null
  files: WorkFile[]
  /** the file on screen when it was saved */
  fileIndex: number
  summary: { axes: number; datasets: number; points: number }
  refs: { sid: string | null; figure: string | null }[]
}

export interface WorkList {
  works: WorkItem[]
  /** works that match, on the server */
  total: number
  offset: number
  /** the server lists works without a format: it keeps no starry-digitizer work */
  unsupported: boolean
}

export interface OpenedWork {
  projectId: string
  project: ProjectDTO
  /** the image, as a File so its name comes along */
  image: File
  sha256: string
}

export type MyWorkErrorCode =
  | 'unsupported'
  | 'other_app'
  | 'not_found'
  | 'invalid_token'
  | 'network'
  | 'invalid'
  | 'http'

const MESSAGES: Record<MyWorkErrorCode, string> = {
  unsupported: 'This server does not keep starry-digitizer work yet.',
  other_app: 'This work was saved by another app and cannot be opened here.',
  not_found: 'The work was not found on the server.',
  invalid_token: 'The sign-in is no longer valid. Sign in again.',
  network: 'The server could not be reached. Try again later.',
  invalid: 'The saved work could not be read.',
  http: 'The server could not send the work. Try again later.',
}

export class MyWorkError extends Error {
  constructor(
    readonly code: MyWorkErrorCode,
    detail?: string,
  ) {
    super(detail ? `${MESSAGES[code]} (${detail})` : MESSAGES[code])
  }
}

export interface MyWorkApiOptions {
  baseUrl: string
  /** the page's headers now (ids, token) — CollectClient.headers() */
  headers(): Record<string, string>
  /** a fetch that drops a refused token (AuthSession.wrapFetch) */
  fetch?: typeof fetch
}

export interface ListParams {
  q?: string
  sort?: WorkSort
  offset?: number
  limit?: number
}

/** The query string of `GET /collect/works`. */
export function worksQuery(params: ListParams): string {
  const query = new URLSearchParams({ format: PROJECT_FORMAT })
  const q = (params.q ?? '').trim().slice(0, 200)
  if (q) query.set('q', q)
  if (params.sort && params.sort !== 'saved') query.set('sort', params.sort)
  query.set('limit', String(params.limit ?? WORKS_PAGE))
  if (params.offset) query.set('offset', String(params.offset))
  return query.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const str = (value: unknown) => (typeof value === 'string' ? value : null)
const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

function parseFile(raw: unknown, i: number): WorkFile | null {
  if (!isRecord(raw) || typeof raw.sha256 !== 'string') return null
  return {
    index: typeof raw.index === 'number' ? raw.index : i,
    sha256: raw.sha256,
    name: str(raw.name),
    type: str(raw.type),
    size: typeof raw.size === 'number' ? raw.size : null,
  }
}

/** One entry of the list (or `work` of one work); null if unusable. */
export function parseWork(raw: unknown): WorkItem | null {
  if (!isRecord(raw) || typeof raw.project_id !== 'string') return null
  const files = Array.isArray(raw.files)
    ? raw.files.map(parseFile).filter((file): file is WorkFile => file !== null)
    : []
  const summary = isRecord(raw.summary) ? raw.summary : {}
  const view = isRecord(raw.view) ? raw.view : {}
  return {
    projectId: raw.project_id,
    createdAt: str(raw.created_at),
    updatedAt: str(raw.updated_at),
    files,
    fileIndex: typeof view.file_index === 'number' ? view.file_index : 0,
    summary: {
      axes: count(summary.axes),
      datasets: count(summary.datasets),
      points: count(summary.points),
    },
    refs: Array.isArray(raw.starrydata)
      ? raw.starrydata.filter(isRecord).map((ref) => ({
          sid: str(ref.sid),
          figure: str(ref.figure),
        }))
      : [],
  }
}

/**
 * The answer of `GET /collect/works?format=starry-digitizer/project`. An
 * older backend ignores `format` and lists its wpd works without one: they
 * cannot be opened here, so they are left out and the list says so.
 */
export function parseWorkList(body: unknown): WorkList {
  if (!isRecord(body) || !Array.isArray(body.works))
    throw new MyWorkError('invalid')
  const raw = body.works.filter(isRecord)
  const unsupported = raw.some((work) => typeof work.format !== 'string')
  const works = raw
    .filter((work) => work.format === PROJECT_FORMAT)
    .map(parseWork)
    .filter((work): work is WorkItem => work !== null)
  return {
    works,
    total: unsupported ? works.length : count(body.total),
    offset: count(body.offset),
    unsupported,
  }
}

/** The file of the work to open: the one on screen when it was saved. */
export function workFile(work: WorkItem): WorkFile | null {
  return (
    work.files.find((file) => file.index === work.fileIndex) ??
    work.files[0] ??
    null
  )
}

/** The first line of an entry: "SID 12345 · Fig. 3(a) — chart.png". */
export function workTitle(work: WorkItem): string {
  const name = workFile(work)?.name || 'image'
  const refs = work.refs
    .filter((ref) => ref.sid || ref.figure)
    .map((ref) =>
      [ref.sid && `SID ${ref.sid}`, ref.figure && `Fig. ${ref.figure}`]
        .filter(Boolean)
        .join(' · '),
    )
  const unique = [...new Set(refs)]
  if (unique.length === 0) return name
  const shown = unique.slice(0, 3).join(', ')
  const more = unique.length > 3 ? ` +${unique.length - 3}` : ''
  return `${shown}${more} — ${name}`
}

export class MyWorkApi {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(private readonly opts: MyWorkApiOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '')
    this.fetchFn = opts.fetch ?? ((input, init) => fetch(input, init))
  }

  private async get(path: string): Promise<Response> {
    let response: Response
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.opts.headers(),
        credentials: 'same-origin',
      })
    } catch {
      throw new MyWorkError('network')
    }
    if (response.ok) return response
    const code = await errorCode(response)
    if (response.status === 401 && code === 'invalid_token')
      throw new MyWorkError('invalid_token')
    if (response.status === 404 && code === 'not_found')
      throw new MyWorkError('not_found')
    // INFO: 404 collection_disabled, and an older backend refusing `format`
    if (response.status === 404 || response.status === 400)
      throw new MyWorkError('unsupported', `HTTP ${response.status}`)
    throw new MyWorkError('http', `HTTP ${response.status}`)
  }

  async list(params: ListParams = {}): Promise<WorkList> {
    const response = await this.get(`/collect/works?${worksQuery(params)}`)
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new MyWorkError('invalid')
    }
    return parseWorkList(body)
  }

  /** The work's small PNG; null when it has none (204, a PDF) or on error. */
  async thumbnail(projectId: string): Promise<Blob | null> {
    try {
      const response = await this.get(
        `/collect/works/${encodeURIComponent(projectId)}/thumbnail`,
      )
      if (response.status === 204) return null
      return await response.blob()
    } catch {
      return null
    }
  }

  /**
   * Download one work: its project (checked by migrateProject, so nothing
   * on screen changes when it cannot be read) and its image (checked by its
   * sha256). Nothing is restored here.
   */
  async fetchWork(projectId: string): Promise<OpenedWork> {
    const id = encodeURIComponent(projectId)
    const response = await this.get(`/collect/works/${id}`)
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new MyWorkError('invalid')
    }
    if (!isRecord(body)) throw new MyWorkError('invalid')
    const raw = isRecord(body.work) ? body.work : null
    if (raw && raw.format !== PROJECT_FORMAT) {
      throw new MyWorkError(
        typeof raw.format === 'string' || 'wpd_json' in body
          ? 'other_app'
          : 'unsupported',
      )
    }
    const work = parseWork(raw)
    if (!work || typeof body.project_json !== 'string')
      throw new MyWorkError('invalid')
    let project: ProjectDTO
    try {
      project = migrateProject(JSON.parse(body.project_json))
    } catch (error) {
      throw new MyWorkError(
        'invalid',
        error instanceof Error ? error.message : undefined,
      )
    }
    const file = workFile(work)
    if (!file) throw new MyWorkError('invalid', 'no image')
    const imageResponse = await this.get(
      `/collect/works/${id}/images/${encodeURIComponent(file.sha256)}`,
    )
    let bytes: Uint8Array
    try {
      bytes = new Uint8Array(await imageResponse.arrayBuffer())
    } catch {
      throw new MyWorkError('network')
    }
    if (sha256Hex(bytes) !== file.sha256)
      throw new MyWorkError('invalid', 'the image does not match')
    const type =
      file.type ||
      imageResponse.headers?.get?.('Content-Type') ||
      'application/octet-stream'
    const image = new File([bytes], file.name || 'image', { type })
    return { projectId: work.projectId, project, image, sha256: file.sha256 }
  }
}
