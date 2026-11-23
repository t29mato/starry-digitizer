import { createEmptyProject, ProjectDTO } from '@/application/dto/projectDTO'
import { CollectClient, KEEPALIVE_BYTES } from './collectClient'
import type { KeyValueStorage } from './collectStorage'
import type { CurrentImage } from './collectWiring'
import {
  PROJECT_FORMAT,
  ProjectSaver,
  SaverClient,
  isUnknownFormat,
  projectHasWork,
  saveStatusText,
} from './projectSaver'

// INFO: a fake client (the CollectClient gates the saver reads), a fake
// backend for `POST /collect/project` (wpd-auto's draft
// docs/starry-digitizer-projects.md 0.0.1) and hand-run timers

type Call = {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function withPoints(n = 1): ProjectDTO {
  const project = createEmptyProject()
  for (let i = 0; i < n; i++)
    project.datasets[0].points.push({ id: i + 1, xPx: 10 + i, yPx: 20 })
  return project
}

const IMAGE: CurrentImage = {
  sha256: 'a'.repeat(64),
  name: 'chart.png',
  type: 'image/png',
  size: 6779,
}

function setup(
  options: {
    answers?: { status: number; body?: unknown; headers?: object }[]
    storage?: KeyValueStorage & { data: Map<string, string> }
    user?: string | null | undefined
    passwordMode?: boolean
    token?: string | null
  } = {},
) {
  const calls: Call[] = []
  const answers = [...(options.answers ?? [])]
  const timers: { fn: () => void; ms: number }[] = []
  const listeners = new Set<() => void>()
  let id = 0
  let seq = 0
  let now = 100000
  const invalidate = jest.fn()
  const client = {
    state: 'on',
    canSend: true,
    user: 'user' in options ? options.user : null,
    clientId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
    environment: 'staging',
    maxJsonBytes: 5242880,
    passwordMode: options.passwordMode ?? false,
    auth: { invalidate },
    headers(user?: string | null) {
      const headers: Record<string, string> = {
        'X-WPD-App': 'starry-digitizer',
        'X-WPD-Client-Id': this.clientId,
      }
      const token = options.token === undefined ? 'tok-1' : options.token
      if (this.passwordMode && typeof user === 'string' && token)
        headers['X-WPD-Token'] = token
      return headers
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    nextSeq: () => ++seq,
  }
  const fetchFn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string),
      keepalive: Boolean(init.keepalive),
    })
    const answer = answers.shift() ?? {
      status: 200,
      body: { stored: true, project_json_sha256: 'f'.repeat(64), new: true },
    }
    if (answer.status === -1) throw new TypeError('Failed to fetch')
    return jsonResponse(answer.status, answer.body ?? {}, answer.headers)
  })
  const state = {
    project: withPoints() as ProjectDTO | null,
    image: IMAGE as CurrentImage | null,
  }
  const warn = jest.fn()
  const views: string[] = []
  const storage = options.storage ?? memoryStorage()
  const saver = new ProjectSaver({
    baseUrl: '/wpd-auto-staging/api/v1/',
    app: { commit: 'abc1234', version: '2.0.0', build: 7 },
    client: client as unknown as SaverClient,
    getProject: () => state.project,
    getImage: () => state.image,
    fetch: fetchFn as unknown as typeof fetch,
    storage,
    now: () => now,
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
    onChange: (view) => views.push(view.state),
    warn,
  })
  const runTimer = async () => {
    const timer = timers.shift()
    timer?.fn()
    await settle()
    await settle()
    return timer
  }
  const advance = (ms: number) => (now += ms)
  const notifyClient = () => listeners.forEach((listener) => listener())
  return {
    saver,
    client,
    calls,
    timers,
    runTimer,
    advance,
    state,
    warn,
    views,
    storage,
    invalidate,
    notifyClient,
  }
}

describe('ProjectSaver: when it sends', () => {
  it('sends 3 s after a change, then at most once every 15 s', async () => {
    const t = setup()
    t.saver.changed()
    expect(t.timers.map((x) => x.ms)).toEqual([3000])
    await t.runTimer()
    expect(t.calls).toHaveLength(1)
    expect(t.saver.view.state).toBe('saved')

    t.advance(1000)
    t.state.project = withPoints(2)
    t.saver.changed()
    // INFO: 15 s after the last save, not 3 s after this change
    expect(t.timers.map((x) => x.ms)).toEqual([14000])
    t.saver.changed()
    expect(t.timers).toHaveLength(1)
    await t.runTimer()
    expect(t.calls).toHaveLength(2)

    t.advance(60000)
    t.state.project = withPoints(3)
    t.saver.changed()
    expect(t.timers.map((x) => x.ms)).toEqual([3000])
  })

  it('sends the format, the ProjectDTO as text and the image as a file', async () => {
    const t = setup()
    t.saver.changed()
    await t.runTimer()
    const [call] = t.calls
    expect(call.url).toBe('/wpd-auto-staging/api/v1/collect/project')
    expect(call.headers).toMatchObject({
      'X-WPD-App': 'starry-digitizer',
      'Content-Type': 'application/json',
    })
    expect(call.keepalive).toBe(false)
    expect(call.body).toMatchObject({
      client_id: '11111111-1111-4111-8111-111111111111',
      session_id: '22222222-2222-4222-8222-222222222222',
      app_commit: 'abc1234',
      app_version: '2.0.0',
      app_build: 7,
      project_id: '00000000-0000-4000-8000-000000000001',
      t: 100000,
      seq: 1,
      format: PROJECT_FORMAT,
      data: {
        files: [{ index: 0, ...IMAGE }],
        view: { file_index: 0 },
      },
    })
    const project = JSON.parse(call.body.project_json as string)
    expect(project.version).toBe('2.0.0')
    expect(project.datasets[0].points).toHaveLength(1)
    expect(Object.keys(call.body).sort()).toEqual(
      [
        'app_build',
        'app_commit',
        'app_version',
        'client_id',
        'data',
        'format',
        'project_id',
        'project_json',
        'seq',
        'session_id',
        't',
      ].sort(),
    )
  })

  it('sends the SID and figure as data.starrydata (wpd-auto shape), only when entered', async () => {
    const t = setup()
    t.state.project = {
      ...withPoints(),
      starrydata: { sid: '12345', figure: '3(b)' },
    }
    t.saver.changed()
    await t.runTimer()
    expect(t.calls[0].body.data).toMatchObject({
      starrydata: [
        {
          file_index: 0,
          page: null,
          file_sha256: IMAGE.sha256,
          sid: '12345',
          figure: '3(b)',
        },
      ],
    })

    const u = setup()
    u.saver.changed()
    await u.runTimer()
    expect(u.calls[0].body.data).not.toHaveProperty('starrydata')
  })

  it('skips an unchanged work (a new timestamp alone is no change)', async () => {
    const t = setup()
    await t.saver.save()
    expect(t.calls).toHaveLength(1)
    t.state.project = { ...withPoints(), timestamp: 'later' }
    await t.saver.save()
    expect(t.calls).toHaveLength(1)
    t.state.project = withPoints(2)
    await t.saver.save()
    expect(t.calls).toHaveLength(2)
  })

  it('does not send an empty work, nor without an image', async () => {
    const t = setup()
    t.state.project = createEmptyProject()
    await t.saver.save()
    t.state.project = withPoints()
    t.state.image = null
    await t.saver.save()
    expect(t.calls).toHaveLength(0)
  })

  it('waits for the gates (notice, name) and goes when they open', async () => {
    const t = setup({ user: undefined })
    t.saver.changed()
    await t.runTimer()
    expect(t.calls).toHaveLength(0)
    t.client.user = 'alice'
    t.notifyClient()
    expect(t.timers).toHaveLength(1)
    await t.runTimer()
    expect(t.calls).toHaveLength(1)
  })
})

describe('ProjectSaver: answers', () => {
  it('409: a new project_id, sent again at once', async () => {
    const t = setup({
      answers: [{ status: 409, body: { error: 'conflict', detail: 'x' } }],
    })
    await t.saver.save()
    expect(t.timers.map((x) => x.ms)).toEqual([0])
    await t.runTimer()
    expect(t.calls.map((c) => c.body.project_id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ])
    expect(t.saver.view.state).toBe('saved')
    expect(t.saver.projectId).toBe('00000000-0000-4000-8000-000000000002')
  })

  it('400 about the format (an older backend): stops quietly', async () => {
    const t = setup({
      answers: [
        {
          status: 400,
          body: {
            error: 'invalid_params',
            detail: "wpd_json must be the project's JSON text",
          },
        },
      ],
    })
    t.saver.changed()
    await t.runTimer()
    expect(t.saver.view.state).toBe('unsupported')
    expect(saveStatusText(t.saver.view)).toBeNull()
    expect(t.warn).not.toHaveBeenCalled()
    t.state.project = withPoints(2)
    t.saver.changed()
    expect(t.timers).toHaveLength(0)
    await t.saver.save()
    expect(t.saver.flushOnHide(KEEPALIVE_BYTES)).toBe(0)
    expect(t.calls).toHaveLength(1)
  })

  it('another 400 / 413: refused, not sent again until the work changes', async () => {
    const t = setup({
      answers: [
        { status: 400, body: { error: 'invalid_params', detail: 'bad' } },
        { status: 413, body: { error: 'too_large' } },
      ],
    })
    await t.saver.save()
    expect(t.saver.view.state).toBe('refused')
    expect(t.warn).toHaveBeenCalled()
    await t.saver.save()
    expect(t.calls).toHaveLength(1)
    t.state.project = withPoints(2)
    await t.saver.save()
    expect(t.calls).toHaveLength(2)
    expect(saveStatusText(t.saver.view)).toBe(
      'Not saved: the server refused the work',
    )
  })

  it('network failure / 5xx: retries with a growing wait, then saved', async () => {
    const t = setup({ answers: [{ status: -1 }, { status: 503 }] })
    await t.saver.save()
    expect(t.saver.view.state).toBe('retrying')
    expect(t.timers.map((x) => x.ms)).toEqual([2000])
    await t.runTimer()
    expect(t.timers.map((x) => x.ms)).toEqual([4000])
    await t.runTimer()
    expect(t.calls).toHaveLength(3)
    expect(t.saver.view).toEqual({ state: 'saved', savedAt: 100000 })
  })

  it('429 waits at least Retry-After', async () => {
    const t = setup({
      answers: [{ status: 429, body: {}, headers: { 'Retry-After': '30' } }],
    })
    await t.saver.save()
    expect(t.timers.map((x) => x.ms)).toEqual([30000])
  })

  it('404 (collection off): stops', async () => {
    const t = setup({ answers: [{ status: 404, body: {} }] })
    await t.saver.save()
    expect(t.saver.view.state).toBe('off')
  })
})

describe('ProjectSaver: the tab is hidden or closed', () => {
  it('sends at once with keepalive and reports the bytes used', async () => {
    const t = setup()
    t.saver.changed()
    const used = t.saver.flushOnHide(KEEPALIVE_BYTES)
    expect(t.timers).toHaveLength(0)
    expect(t.calls).toHaveLength(1)
    expect(t.calls[0].keepalive).toBe(true)
    expect(used).toBeGreaterThan(100)
    expect(used).toBeLessThan(KEEPALIVE_BYTES)
    await settle()
    expect(t.saver.view.state).toBe('saved')
    // INFO: nothing changed since: nothing more
    expect(t.saver.flushOnHide(KEEPALIVE_BYTES)).toBe(0)
    expect(t.calls).toHaveLength(1)
  })

  it('a work too large for keepalive goes as an ordinary request', () => {
    const t = setup()
    t.state.project = withPoints(3000)
    expect(t.saver.flushOnHide(KEEPALIVE_BYTES)).toBe(0)
    expect(t.calls).toHaveLength(1)
    expect(t.calls[0].keepalive).toBe(false)
  })

  it('CollectClient.flushOnHide sends the project first, events in the rest', async () => {
    const urls: { url: string; keepalive: boolean }[] = []
    const fetchFn = async (url: string, init: RequestInit) => {
      urls.push({ url, keepalive: Boolean(init.keepalive) })
      return jsonResponse(
        200,
        url.endsWith('/collect/status')
          ? { enabled: true, environment: 'staging' }
          : {},
      )
    }
    const client = new CollectClient({
      baseUrl: '/api',
      app: { commit: null, version: null, build: null },
      fetch: fetchFn as unknown as typeof fetch,
      storage: null,
      setTimer: () => null,
      clearTimer: () => undefined,
    })
    await client.start()
    client.markNoticeShown()
    client.record('edit', { action: 'x' })
    const budgets: number[] = []
    client.onHide = (budget) => {
      budgets.push(budget)
      urls.push({ url: 'project', keepalive: true })
      return budget - 100
    }
    client.flushOnHide()
    // INFO: only 100 bytes left: the event (with the request's ~200 bytes
    // of envelope) does not fit and stays queued
    expect(budgets).toEqual([KEEPALIVE_BYTES])
    expect(urls.map((u) => u.url).slice(-1)).toEqual(['project'])
    expect(client.pending).toBe(1)
    client.onHide = () => 0
    client.flushOnHide()
    expect(urls.at(-1)).toEqual({ url: '/api/collect/events', keepalive: true })
  })
})

describe('ProjectSaver: which work', () => {
  it('a new image is a new work; the same image again in a new page resumes it', async () => {
    const storage = memoryStorage()
    const t = setup({ storage })
    await t.saver.save()
    t.state.image = { ...IMAGE, sha256: 'b'.repeat(64) }
    await t.saver.save()
    expect(t.calls.map((c) => c.body.project_id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ])
    expect(
      JSON.parse(
        storage.data.get('starry-digitizer.staging.project') as string,
      ),
    ).toEqual({
      project_id: '00000000-0000-4000-8000-000000000002',
      sha256: 'b'.repeat(64),
      user: null,
    })
    // INFO: a reload (the browser's auto-save restored the same image)
    const again = setup({ storage })
    again.state.image = { ...IMAGE, sha256: 'b'.repeat(64) }
    await again.saver.save()
    expect(again.calls[0].body.project_id).toBe(
      '00000000-0000-4000-8000-000000000002',
    )
  })

  it('another person is another work', async () => {
    const t = setup({ user: 'alice' })
    await t.saver.save()
    t.client.user = 'bob'
    await t.saver.save()
    expect(t.calls[1].body.project_id).not.toBe(t.calls[0].body.project_id)
  })

  it('newWork() (File > Start Over) does not resume the kept work', async () => {
    const storage = memoryStorage()
    const t = setup({ storage })
    await t.saver.save()
    t.saver.newWork()
    t.state.project = withPoints(2)
    await t.saver.save()
    expect(t.calls[1].body.project_id).toBe(
      '00000000-0000-4000-8000-000000000002',
    )
  })

  it('continueWork() keeps the opened id and counts the screen as saved', async () => {
    const t = setup()
    t.saver.beginOpen()
    await t.saver.save()
    expect(t.calls).toHaveLength(0)
    t.saver.continueWork('33333333-3333-4333-8333-333333333333', IMAGE.sha256)
    await t.saver.save()
    expect(t.calls).toHaveLength(0)
    t.state.project = withPoints(2)
    await t.saver.save()
    expect(t.calls[0].body.project_id).toBe(
      '33333333-3333-4333-8333-333333333333',
    )
  })

  it('continueWork() with another image on screen does not take the id', async () => {
    const t = setup()
    t.saver.beginOpen()
    t.saver.continueWork('33333333-3333-4333-8333-333333333333', 'c'.repeat(64))
    await t.saver.save()
    expect(t.calls[0].body.project_id).not.toBe(
      '33333333-3333-4333-8333-333333333333',
    )
  })
})

describe('ProjectSaver: passwords', () => {
  it('sends with the token of the person the work belongs to', async () => {
    const t = setup({ user: 'alice', passwordMode: true })
    await t.saver.save()
    expect(t.calls[0].headers['X-WPD-Token']).toBe('tok-1')
  })

  it('holds the work when the token is gone', async () => {
    const t = setup({ user: 'alice', passwordMode: true, token: null })
    await t.saver.save()
    expect(t.calls).toHaveLength(0)
  })

  it('401 invalid_token: drops the token and holds the work', async () => {
    const t = setup({
      user: 'alice',
      passwordMode: true,
      answers: [{ status: 401, body: { error: 'invalid_token' } }],
    })
    await t.saver.save()
    expect(t.invalidate).toHaveBeenCalledWith('tok-1')
    expect(t.timers).toHaveLength(0)
    expect(t.saver.view.state).toBe('idle')
    // INFO: signed in again: sent
    t.notifyClient()
    await t.runTimer()
    expect(t.calls).toHaveLength(2)
  })
})

describe('helpers', () => {
  it('projectHasWork', () => {
    expect(projectHasWork(createEmptyProject())).toBe(false)
    expect(projectHasWork(withPoints())).toBe(true)
    const axis = createEmptyProject()
    axis.axisSets[0].x1.coord = { xPx: 5, yPx: 6 }
    expect(projectHasWork(axis)).toBe(true)
  })

  it('isUnknownFormat', () => {
    expect(isUnknownFormat('invalid_params', 'wpd_json must be …')).toBe(true)
    expect(isUnknownFormat('invalid_params', 'unknown format')).toBe(true)
    expect(isUnknownFormat('invalid_params', 'data must be an object')).toBe(
      false,
    )
    expect(isUnknownFormat('invalid_json', 'format')).toBe(false)
  })

  it('saveStatusText', () => {
    const time = () => '12:34'
    expect(saveStatusText({ state: 'saved', savedAt: 1 }, time)).toBe(
      'Saved on the server 12:34',
    )
    expect(saveStatusText({ state: 'retrying', savedAt: null }, time)).toBe(
      'Not saved yet — retrying',
    )
    expect(saveStatusText({ state: 'retrying', savedAt: 1 }, time)).toBe(
      'Not saved yet — retrying (last saved 12:34)',
    )
    expect(saveStatusText({ state: 'idle', savedAt: null }, time)).toBeNull()
    expect(saveStatusText({ state: 'off', savedAt: 1 }, time)).toBeNull()
  })
})
