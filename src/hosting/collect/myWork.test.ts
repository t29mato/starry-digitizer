import { createDigitizerContext } from '@/application/digitizerContext'
import { createEmptyProject, ProjectDTO } from '@/application/dto/projectDTO'
import { CollectClient } from './collectClient'
import { startCollect } from './collectApp'
import {
  MyWorkApi,
  MyWorkError,
  parseWorkList,
  workTitle,
  worksQuery,
} from './myWork'
import { PROJECT_FORMAT } from './projectSaver'
import { sha256Hex } from './sha256'

// INFO: My work against a fake backend that answers as wpd-auto's draft
// docs/starry-digitizer-projects.md 0.0.1 says (`format` on the works),
// and as today's backend does (no `format`: its wpd works)

const PID = '44444444-4444-4444-8444-444444444444'
const BYTES = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
const SHA = sha256Hex(BYTES)

function work(extra: Record<string, unknown> = {}) {
  return {
    project_id: PID,
    created_at: '2026-11-24T01:00:00Z',
    updated_at: '2026-11-24T03:34:00Z',
    user: 'alice',
    format: PROJECT_FORMAT,
    client: 'starry-digitizer',
    files: [
      {
        index: 0,
        sha256: SHA,
        name: 'chart.png',
        type: 'image/png',
        size: BYTES.length,
        stored: true,
      },
    ],
    summary: { axes: 1, datasets: 2, points: 40, measurements: 0 },
    starrydata: [],
    view: { file_index: 0, page: null, page_count: null },
    ...extra,
  }
}

function savedProject(): ProjectDTO {
  const project = createEmptyProject()
  project.datasets[0].name = 'opened'
  project.datasets[0].points.push({ id: 1, xPx: 3, yPx: 4 })
  return project
}

type Answer = { status: number; body?: unknown; bytes?: Uint8Array }

function response({ status, body, bytes }: Answer) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map([['Content-Type', 'image/png']]),
    json: async () => body,
    blob: async () => new Blob([bytes ?? new Uint8Array()]),
    arrayBuffer: async () => (bytes ?? new Uint8Array()).buffer,
  } as unknown as Response
}

function fakeFetch(routes: Record<string, Answer>) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      headers: (init?.headers ?? {}) as Record<string, string>,
    })
    const path = url.replace(/^\/api/, '').split('?')[0]
    return response(routes[path] ?? { status: 404, body: { error: 'x' } })
  })
  return { fn: fn as unknown as typeof fetch, calls }
}

function api(routes: Record<string, Answer>) {
  const f = fakeFetch(routes)
  return {
    api: new MyWorkApi({
      baseUrl: '/api/',
      headers: () => ({ 'X-WPD-App': 'starry-digitizer', 'X-WPD-Token': 't' }),
      fetch: f.fn,
    }),
    calls: f.calls,
  }
}

const openRoutes = (body: unknown, bytes = BYTES): Record<string, Answer> => ({
  [`/collect/works/${PID}`]: { status: 200, body },
  [`/collect/works/${PID}/images/${SHA}`]: { status: 200, bytes },
})

describe('the list', () => {
  it('asks for this format, the search and the sort', () => {
    expect(worksQuery({})).toBe('format=starry-digitizer%2Fproject&limit=50')
    expect(worksQuery({ q: ' Fig 3 ', sort: 'name', offset: 50 })).toBe(
      'format=starry-digitizer%2Fproject&q=Fig+3&sort=name&limit=50&offset=50',
    )
  })

  it('reads the works of this format', () => {
    const list = parseWorkList({
      user: { id: 'alice', name: 'Alice' },
      works: [work()],
      total: 1,
      offset: 0,
    })
    expect(list.unsupported).toBe(false)
    expect(list.total).toBe(1)
    expect(list.works[0]).toEqual({
      projectId: PID,
      createdAt: '2026-11-24T01:00:00Z',
      updatedAt: '2026-11-24T03:34:00Z',
      files: [
        {
          index: 0,
          sha256: SHA,
          name: 'chart.png',
          type: 'image/png',
          size: BYTES.length,
        },
      ],
      fileIndex: 0,
      summary: { axes: 1, datasets: 2, points: 40 },
      refs: [],
    })
  })

  it('an older backend (works without a format): left out, and said so', () => {
    const { format, ...wpd } = work()
    void format
    const list = parseWorkList({ works: [wpd], total: 7, offset: 0 })
    expect(list).toMatchObject({ works: [], total: 0, unsupported: true })
  })

  it('the title shows SID and figure, then the file name', () => {
    const [item] = parseWorkList({
      works: [
        work({
          starrydata: [
            { sid: '12345', figure: '3(a)' },
            { sid: '12345', figure: '3(a)' },
          ],
        }),
      ],
    }).works
    expect(workTitle(item)).toBe('SID 12345 · Fig. 3(a) — chart.png')
  })

  it('sends the page headers; 401 invalid_token and 400 are errors', async () => {
    const ok = api({ '/collect/works': { status: 200, body: { works: [] } } })
    await ok.api.list()
    expect(ok.calls[0].headers['X-WPD-Token']).toBe('t')
    const bad = api({
      '/collect/works': { status: 401, body: { error: 'invalid_token' } },
    })
    await expect(bad.api.list()).rejects.toMatchObject({
      code: 'invalid_token',
    })
    const old = api({
      '/collect/works': { status: 400, body: { error: 'invalid_params' } },
    })
    await expect(old.api.list()).rejects.toMatchObject({ code: 'unsupported' })
  })
})

describe('opening a work', () => {
  it('returns the checked project and the image as a File', async () => {
    const { api: myWork } = api(
      openRoutes({
        work: work(),
        project_json: JSON.stringify(savedProject()),
      }),
    )
    const opened = await myWork.fetchWork(PID)
    expect(opened.projectId).toBe(PID)
    expect(opened.sha256).toBe(SHA)
    expect(opened.project.datasets[0].name).toBe('opened')
    expect(opened.image.name).toBe('chart.png')
    expect(opened.image.type).toBe('image/png')
    expect(opened.image.size).toBe(BYTES.length)
  })

  it('a wpd work cannot be opened', async () => {
    const { format, ...wpd } = work()
    void format
    const { api: myWork } = api(openRoutes({ work: wpd, wpd_json: '{}' }))
    await expect(myWork.fetchWork(PID)).rejects.toMatchObject({
      code: 'other_app',
    })
  })

  it('an unreadable project or a wrong image is refused', async () => {
    const broken = api(openRoutes({ work: work(), project_json: '{"a":1}' }))
    await expect(broken.api.fetchWork(PID)).rejects.toMatchObject({
      code: 'invalid',
    })
    const wrong = api(
      openRoutes(
        { work: work(), project_json: JSON.stringify(savedProject()) },
        Uint8Array.from([1, 2, 3]),
      ),
    )
    await expect(wrong.api.fetchWork(PID)).rejects.toBeInstanceOf(MyWorkError)
  })
})

describe('startCollect: Open from My work', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

  function started(routes: Record<string, Answer>) {
    const f = fakeFetch({
      '/collect/status': {
        status: 200,
        body: { enabled: true, environment: 'test' },
      },
      '/collect/users': { status: 200, body: { enabled: false } },
      ...routes,
    })
    const client = new CollectClient({
      baseUrl: '/api',
      app: { commit: null, version: null, build: null },
      fetch: f.fn,
      storage: null,
    })
    const ctx = createDigitizerContext()
    const handle = startCollect(ctx, '/api', {
      version: '2.0.0',
      client,
      fetch: f.fn,
      onChange: () => undefined,
      afterRender: async () => undefined,
    })
    return { ctx, handle, calls: f.calls }
  }

  it('downloads, restores through the given path, and continues the work', async () => {
    localStorage.clear()
    const { ctx, handle } = started(
      openRoutes({
        work: work(),
        project_json: JSON.stringify(savedProject()),
      }),
    )
    await settle()
    expect(handle.hasWork()).toBe(false)
    const restore = jest.fn(async (project: ProjectDTO, image: File) => {
      // INFO: what <StarryDigitizer>.loadProject does, without a canvas
      const url = `data:${image.type};base64,${btoa(
        String.fromCharCode(...BYTES),
      )}`
      ctx.canvasHandler.setUploadImageUrl(url)
      ctx.projectService.restoreProject(project)
    })
    const opened = await handle.openWork(PID, restore)
    expect(restore).toHaveBeenCalledTimes(1)
    expect(restore.mock.calls[0][0].datasets[0].name).toBe('opened')
    expect(restore.mock.calls[0][1].name).toBe('chart.png')
    expect(opened.projectId).toBe(PID)
    expect(handle.hasWork()).toBe(true)
    // INFO: later saves go to the opened work (kept per environment)
    expect(
      JSON.parse(localStorage.getItem('starry-digitizer.test.project') ?? '{}'),
    ).toEqual({ project_id: PID, sha256: SHA, user: null })
    handle.stop()
  })

  it('changes nothing when the download fails', async () => {
    const { handle } = started({
      [`/collect/works/${PID}`]: {
        status: 404,
        body: { error: 'not_found' },
      },
    })
    await settle()
    const restore = jest.fn(async () => undefined)
    await expect(handle.openWork(PID, restore)).rejects.toMatchObject({
      code: 'not_found',
    })
    expect(restore).not.toHaveBeenCalled()
    handle.stop()
  })
})
