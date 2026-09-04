import type { ProjectDTO } from '@/application/dto/projectDTO'

// INFO: Crash/reload recovery for the STANDALONE APP ONLY (src/App.vue).
//
// Digitizing one figure takes tens of minutes, and a stray reload used to
// throw away the image, the axis calibration and every point. The library
// deliberately does NOT persist anything by itself: where the work belongs is
// the host's decision (Starrydata3 stores it on its own backend), and a
// library that also wrote to localStorage would create a second source of
// truth plus a restore race on mount. So the standalone app — which has no
// backend — does it here, on top of the public API the library already
// exposes (`@update:project`, `loadProject(project, image)`).
//
// This module must stay unreachable from the library entry points; it is
// excluded in tsconfig.lib.json next to App.vue / main.ts / appContext.ts.
//
// Storage: IndexedDB, one object store with two keys.
//   - IndexedDB rather than localStorage because the image has to survive.
//     localStorage is ~5MB of *strings* per origin, and a data URL adds 33%
//     of base64 overhead on top of the PNG, so a normal 1180x980 figure blows
//     the quota — and `setItem` then throws synchronously. IndexedDB stores
//     the Blob as-is.
//   - Two keys (not one record) so that saving the project on every plotted
//     point does not rewrite the image blob along with it. The image is
//     written only when the image itself changes.

const DB_NAME = 'starry-digitizer-app'
const DB_VERSION = 1
const STORE_NAME = 'session'
const PROJECT_KEY = 'project'
const IMAGE_KEY = 'image'

/** Minimal key/value store, so the persistence logic can be tested without IndexedDB. */
export interface SessionStore {
  get(key: string): Promise<unknown>
  put(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<void>
}

export interface SavedSession {
  project: ProjectDTO
  /** Absent when no image was ever saved (the app then keeps the one its `image` prop loaded). */
  image?: Blob
}

export interface AppPersistence {
  /** Read the saved work, or null when there is none / it is unusable. */
  load(): Promise<SavedSession | null>
  saveProject(project: ProjectDTO): Promise<void>
  /** `null` removes the saved image (the app has none any more). */
  saveImage(image: Blob | null): Promise<void>
  /** Drop everything — "Start Over". */
  clear(): Promise<void>
}

function warn(message: string, error?: unknown): void {
  console.warn(`[starry-digitizer] ${message}`, error)
}

/**
 * Cheap shape check for a record read back from storage. Anything that is not
 * recognizably a project is dropped silently rather than handed to
 * `loadProject`, which would surface a corrupt leftover as an error toast on
 * an otherwise fine startup.
 */
function isProjectLike(value: unknown): value is ProjectDTO {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectDTO>
  return (
    typeof candidate.version === 'string' &&
    Array.isArray(candidate.axisSets) &&
    Array.isArray(candidate.datasets)
  )
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function wrapDatabase(db: IDBDatabase): SessionStore {
  const run = <T>(
    mode: 'readonly' | 'readwrite',
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const transaction = db.transaction(STORE_NAME, mode)
    const result = promisifyRequest(
      operation(transaction.objectStore(STORE_NAME)),
    )
    return new Promise((resolve, reject) => {
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
      result.then(resolve, reject)
    })
  }

  return {
    get: (key) => run('readonly', (store) => store.get(key)),
    put: (key, value) =>
      run('readwrite', (store) => store.put(value, key)).then(() => undefined),
    delete: (key) =>
      run('readwrite', (store) => store.delete(key)).then(() => undefined),
  }
}

/**
 * Open the app's IndexedDB store. Resolves to `null` — never rejects — when
 * IndexedDB is unavailable (private windows, blocked site data, an upgrade
 * blocked by another tab); the caller then simply does not persist.
 */
export function openIndexedDbSessionStore(): Promise<SessionStore | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      resolve(null)
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (error) {
      // INFO: Firefox in a private window throws right here.
      warn('auto-save is unavailable (IndexedDB could not be opened)', error)
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onerror = () => {
      warn(
        'auto-save is unavailable (IndexedDB could not be opened)',
        request.error,
      )
      resolve(null)
    }
    request.onblocked = () => resolve(null)
    request.onsuccess = () => resolve(wrapDatabase(request.result))
  })
}

/**
 * Auto-save/restore on top of a {@link SessionStore}.
 *
 * Every method resolves even when storage misbehaves: losing the safety net
 * must never take the app down with it. After the first failed write the
 * instance goes quiet (no further attempts, no repeated warnings) so a
 * blocked store cannot spam the console once per plotted point.
 */
export function createAppPersistence(
  openStore: () => Promise<SessionStore | null> = openIndexedDbSessionStore,
): AppPersistence {
  let storePromise: Promise<SessionStore | null> | undefined
  let disabled = false
  // INFO: writes are serialized so a burst (project + image) cannot land out
  // of order, and so `clear()` is never overtaken by a save queued before it.
  let queue: Promise<void> = Promise.resolve()

  const store = (): Promise<SessionStore | null> => {
    if (disabled) return Promise.resolve(null)
    if (!storePromise) {
      storePromise = openStore().catch((error) => {
        warn('auto-save is unavailable', error)
        return null
      })
    }
    return storePromise
  }

  const enqueue = (
    what: string,
    task: (store: SessionStore) => Promise<unknown>,
  ): Promise<void> => {
    const run = async () => {
      if (disabled) return
      const opened = await store()
      if (!opened) return
      try {
        await task(opened)
      } catch (error) {
        disabled = true
        warn(`auto-save stopped (${what} failed)`, error)
      }
    }
    queue = queue.then(run, run)
    return queue
  }

  return {
    async load() {
      try {
        const opened = await store()
        if (!opened) return null
        const [project, image] = await Promise.all([
          opened.get(PROJECT_KEY),
          opened.get(IMAGE_KEY),
        ])
        if (!isProjectLike(project)) return null
        return image instanceof Blob ? { project, image } : { project }
      } catch (error) {
        warn('could not read the auto-saved work', error)
        return null
      }
    },

    saveProject(project) {
      // INFO: a structured clone of a Vue-reactive DTO can throw; the DTO is
      // plain JSON data anyway, so copy it that way and hand IndexedDB an
      // ordinary object.
      let plain: unknown
      try {
        plain = JSON.parse(JSON.stringify(project))
      } catch (error) {
        warn('could not serialize the project for auto-save', error)
        return Promise.resolve()
      }
      return enqueue('project save', (opened) => opened.put(PROJECT_KEY, plain))
    },

    saveImage(image) {
      return enqueue('image save', (opened) =>
        image === null
          ? opened.delete(IMAGE_KEY)
          : opened.put(IMAGE_KEY, image),
      )
    },

    clear() {
      return enqueue('clear', async (opened) => {
        await opened.delete(PROJECT_KEY)
        await opened.delete(IMAGE_KEY)
      })
    },
  }
}
