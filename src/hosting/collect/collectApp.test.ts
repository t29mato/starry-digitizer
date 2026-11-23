import { createDigitizerContext } from '@/application/digitizerContext'
import { CollectClient } from './collectClient'
import { appInfo, CollectView, startCollect } from './collectApp'

function client(status: unknown, users: unknown = { enabled: false }) {
  const urls: string[] = []
  const fetchFn = async (url: string) => {
    urls.push(url)
    const body = url.endsWith('/collect/status')
      ? status
      : url.endsWith('/collect/users')
      ? users
      : {}
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => body,
    } as unknown as Response
  }
  const c = new CollectClient({
    baseUrl: '/api',
    app: { commit: null, version: null, build: null },
    fetch: fetchFn as unknown as typeof fetch,
    storage: null,
  })
  return { c, urls }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('startCollect', () => {
  it('shows the notice first and only then lets the client send', async () => {
    const { c } = client({ enabled: true, environment: 'staging' })
    const order: string[] = []
    let rendered: () => void = () => undefined
    const views: CollectView[] = []
    const handle = startCollect(createDigitizerContext(), '/api', {
      version: '2.0.0',
      client: c,
      onChange: (view) => views.push(view),
      afterRender: () =>
        new Promise<void>((resolve) => {
          order.push('render')
          rendered = resolve
        }),
    })
    await settle()
    expect(views.at(-1)).toMatchObject({ on: true, hasNames: false })
    expect(order).toEqual(['render'])
    expect(c.canSend).toBe(false)
    rendered()
    await settle()
    expect(c.canSend).toBe(true)
    handle.stop()
  })

  it('lets the research hook go when the server does not collect', async () => {
    const ctx = createDigitizerContext()
    const { c } = client({ enabled: false })
    startCollect(ctx, '/api', {
      version: '2.0.0',
      client: c,
      onChange: () => undefined,
      afterRender: async () => undefined,
    })
    expect(ctx.researchEvents.isEnabled).toBe(true)
    await settle()
    expect(ctx.researchEvents.isEnabled).toBe(false)
    expect(c.pending).toBe(0)
  })

  it('reports the names to the page and the choice back to the client', async () => {
    const { c } = client(
      { enabled: true },
      { enabled: true, guest: true, users: [{ id: 'alice', name: 'Alice' }] },
    )
    const views: CollectView[] = []
    const handle = startCollect(createDigitizerContext(), '/api', {
      version: '2.0.0',
      client: c,
      onChange: (view) => views.push(view),
      afterRender: async () => undefined,
    })
    await settle()
    expect(views.at(-1)).toMatchObject({ needsUser: true, hasNames: true })
    handle.chooseUser('alice')
    expect(views.at(-1)).toMatchObject({ needsUser: false, userName: 'Alice' })
    handle.stop()
  })
})

describe('appInfo', () => {
  it('keeps valid values and turns the rest into null', () => {
    expect(appInfo('0123abcd', '12', '2.0.0')).toEqual({
      commit: '0123abcd',
      build: 12,
      version: '2.0.0',
    })
    expect(appInfo(undefined, '', 'dev')).toEqual({
      commit: null,
      build: null,
      version: null,
    })
    expect(appInfo('XYZ', '0', '2.0.0-rc.1')).toEqual({
      commit: null,
      build: null,
      version: '2.0.0-rc.1',
    })
  })
})
