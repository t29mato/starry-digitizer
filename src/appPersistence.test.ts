import { createAppPersistence, type SessionStore } from '@/appPersistence'
import type { ProjectDTO } from '@/application/dto/projectDTO'

// INFO: jsdom has no IndexedDB, so `openIndexedDbSessionStore` itself is only
// exercised in the browser (see the manual/puppeteer run). Everything above
// it takes a SessionStore, which is what these tests drive.
function createMemoryStore(): SessionStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>()
  return {
    data,
    get: (key) => Promise.resolve(data.get(key)),
    put: (key, value) => {
      data.set(key, value)
      return Promise.resolve()
    },
    delete: (key) => {
      data.delete(key)
      return Promise.resolve()
    },
  }
}

function project(overrides: Partial<ProjectDTO> = {}): ProjectDTO {
  return {
    version: '2.0.0',
    timestamp: '2026-01-01T00:00:00.000Z',
    axisSets: [],
    activeAxisSetId: 1,
    datasets: [],
    activeDatasetId: 1,
    ...overrides,
  } as ProjectDTO
}

describe('createAppPersistence', () => {
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  test('load() returns null when nothing was saved', async () => {
    const persistence = createAppPersistence(async () => createMemoryStore())

    expect(await persistence.load()).toBeNull()
  })

  test('saves and restores the project and the image', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)
    const image = new Blob(['x'], { type: 'image/png' })

    await persistence.saveProject(project({ activeDatasetId: 7 }))
    await persistence.saveImage(image)

    const restored = await persistence.load()
    expect(restored?.project.activeDatasetId).toBe(7)
    expect(restored?.image).toBe(image)
  })

  test('the project and the image live under separate keys, so saving the project does not rewrite the image', async () => {
    const store = createMemoryStore()
    const put = jest.spyOn(store, 'put')
    const persistence = createAppPersistence(async () => store)

    await persistence.saveImage(new Blob(['x'], { type: 'image/png' }))
    put.mockClear()

    await persistence.saveProject(project())
    await persistence.saveProject(project({ activeDatasetId: 2 }))

    expect(put).toHaveBeenCalledTimes(2)
    expect(put.mock.calls.map((call) => call[0])).toEqual(['project', 'project'])
    // the image survived untouched
    expect(await store.get('image')).toBeInstanceOf(Blob)
  })

  test('stores the project as plain JSON data (a reactive proxy would not be cloneable)', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)
    const source = project()
    const proxied = new Proxy(source, {})

    await persistence.saveProject(proxied)

    const saved = await store.get('project')
    expect(saved).not.toBe(proxied)
    expect(saved).toEqual(source)
  })

  test('load() ignores a record that is not a project', async () => {
    const store = createMemoryStore()
    await store.put('project', { nonsense: true })
    const persistence = createAppPersistence(async () => store)

    expect(await persistence.load()).toBeNull()
  })

  test('load() ignores a saved image that is not a blob', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)
    await persistence.saveProject(project())
    await store.put('image', 'not-a-blob')

    const restored = await persistence.load()
    expect(restored?.project).toBeDefined()
    expect(restored?.image).toBeUndefined()
  })

  test('saveImage(null) removes the saved image but keeps the project', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)
    await persistence.saveProject(project())
    await persistence.saveImage(new Blob(['x']))

    await persistence.saveImage(null)

    expect(await store.get('image')).toBeUndefined()
    expect(await persistence.load()).not.toBeNull()
  })

  test('clear() drops everything', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)
    await persistence.saveProject(project())
    await persistence.saveImage(new Blob(['x']))

    await persistence.clear()

    expect(store.data.size).toBe(0)
    expect(await persistence.load()).toBeNull()
  })

  test('does nothing (and does not throw) when the store is unavailable', async () => {
    const persistence = createAppPersistence(async () => null)

    await expect(persistence.saveProject(project())).resolves.toBeUndefined()
    await expect(persistence.saveImage(new Blob(['x']))).resolves.toBeUndefined()
    await expect(persistence.clear()).resolves.toBeUndefined()
    expect(await persistence.load()).toBeNull()
  })

  test('survives a store that fails to open', async () => {
    const persistence = createAppPersistence(() =>
      Promise.reject(new Error('blocked')),
    )

    await expect(persistence.saveProject(project())).resolves.toBeUndefined()
    expect(await persistence.load()).toBeNull()
  })

  test('a failing write stops further attempts instead of throwing or spamming', async () => {
    const store = createMemoryStore()
    jest
      .spyOn(store, 'put')
      .mockRejectedValue(new Error('QuotaExceededError'))
    const persistence = createAppPersistence(async () => store)

    await expect(persistence.saveProject(project())).resolves.toBeUndefined()
    await persistence.saveProject(project())
    await persistence.saveProject(project())

    expect(store.put).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  test('opens the store once, however many saves happen', async () => {
    const store = createMemoryStore()
    const openStore = jest.fn(async () => store)
    const persistence = createAppPersistence(openStore)

    await persistence.load()
    await persistence.saveProject(project())
    await persistence.saveImage(new Blob(['x']))

    expect(openStore).toHaveBeenCalledTimes(1)
  })

  test('serializes writes, so a save queued before clear() cannot overtake it', async () => {
    const store = createMemoryStore()
    const persistence = createAppPersistence(async () => store)

    const saving = persistence.saveProject(project())
    const clearing = persistence.clear()
    await Promise.all([saving, clearing])

    expect(store.data.size).toBe(0)
  })
})
