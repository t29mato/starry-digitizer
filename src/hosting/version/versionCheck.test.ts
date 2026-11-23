import {
  isNewVersion,
  parseVersionTxt,
  reloadAfterFlush,
  runningVersion,
  versionCheckEnabled,
  watchVersion,
  VERSION_CHECK_INTERVAL_MS,
} from './versionCheck'

const COMMIT_A = 'a'.repeat(40)
const COMMIT_B = 'b'.repeat(40)

// INFO: what deploy/deploy.sh writes
function versionTxt(commit: string, build: number) {
  return `${commit}\nversion=2.0.0\nbuild=${build}\nenvironment=staging\ndeployed=2026-11-24T00:00:00Z\n`
}

function textResponse(status: number, text: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

function fakeDocument() {
  const listeners = new Set<() => void>()
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    fire() {
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

function setup(texts: (string | number | Error)[]) {
  const answers = [...texts]
  const fetchFn = jest.fn(async () => {
    const next = answers.shift() ?? answers.at(-1) ?? ''
    if (next instanceof Error) throw next
    if (typeof next === 'number') return textResponse(next, '')
    return textResponse(200, next)
  })
  const timers: { fn: () => void; ms: number }[] = []
  const doc = fakeDocument()
  const seen: unknown[] = []
  const stop = watchVersion({
    url: '/starry-digitizer/VERSION.txt',
    running: { commit: COMMIT_A, build: '5' },
    onNewVersion: (served) => seen.push(served),
    fetch: fetchFn as unknown as typeof fetch,
    document: doc as unknown as Document,
    setInterval: (fn, ms) => {
      const timer = { fn, ms }
      timers.push(timer)
      return timer
    },
    clearInterval: (timer) => {
      const i = timers.indexOf(timer as { fn: () => void; ms: number })
      if (i >= 0) timers.splice(i, 1)
    },
  })
  return { fetchFn, timers, doc, seen, stop }
}

describe('parseVersionTxt', () => {
  it('reads the commit and the build of deploy.sh', () => {
    expect(parseVersionTxt(versionTxt(COMMIT_A, 12))).toEqual({
      commit: COMMIT_A,
      build: '12',
    })
  })

  it('returns null for an HTML error page', () => {
    expect(parseVersionTxt('<!doctype html><title>404</title>')).toBeNull()
  })
})

describe('isNewVersion', () => {
  const running = { commit: COMMIT_A, build: '5' }

  it('is new when the commit or the build differs', () => {
    expect(isNewVersion(running, { commit: COMMIT_B, build: '5' })).toBe(true)
    // INFO: deploy.sh rebuilt the same commit
    expect(isNewVersion(running, { commit: COMMIT_A, build: '6' })).toBe(true)
  })

  it('is not new for the same deploy, nor for parts it cannot compare', () => {
    expect(isNewVersion(running, { commit: COMMIT_A, build: '5' })).toBe(false)
    expect(isNewVersion(running, { commit: null, build: '5' })).toBe(false)
    expect(
      isNewVersion(
        { commit: null, build: null },
        { commit: COMMIT_B, build: '9' },
      ),
    ).toBe(false)
  })
})

describe('versionCheckEnabled', () => {
  const running = runningVersion(COMMIT_A, '5')

  it('runs only for the starryai build', () => {
    expect(
      versionCheckEnabled({ autoServiceUrl: '/api', pwaOff: true, running }),
    ).toBe(true)
    // INFO: the Vercel build: no auto service, PWA on
    expect(
      versionCheckEnabled({
        autoServiceUrl: undefined,
        pwaOff: false,
        running,
      }),
    ).toBe(false)
    expect(
      versionCheckEnabled({ autoServiceUrl: '/api', pwaOff: false, running }),
    ).toBe(false)
  })

  it('does nothing for a local build without commit and build', () => {
    expect(
      versionCheckEnabled({
        autoServiceUrl: '/api',
        pwaOff: true,
        running: runningVersion(undefined, ''),
      }),
    ).toBe(false)
  })
})

describe('watchVersion', () => {
  it('looks at once, without the cache, and every 5 minutes', async () => {
    const { fetchFn, timers, seen, stop } = setup([versionTxt(COMMIT_A, 5)])
    await settle()
    expect(fetchFn).toHaveBeenCalledWith('/starry-digitizer/VERSION.txt', {
      cache: 'no-store',
    })
    expect(timers.map((t) => t.ms)).toEqual([VERSION_CHECK_INTERVAL_MS])
    expect(seen).toEqual([])
    stop()
    expect(timers).toHaveLength(0)
  })

  it('reports a new deploy once, and a later one again', async () => {
    const { timers, seen, stop } = setup([
      versionTxt(COMMIT_A, 5),
      versionTxt(COMMIT_B, 6),
      versionTxt(COMMIT_B, 6),
      versionTxt(COMMIT_B, 7),
    ])
    await settle()
    for (let i = 0; i < 3; i++) {
      timers[0].fn()
      await settle()
    }
    expect(seen).toEqual([
      { commit: COMMIT_B, build: '6' },
      { commit: COMMIT_B, build: '7' },
    ])
    stop()
  })

  it('looks again when the tab becomes visible, and stays quiet on failures', async () => {
    const { fetchFn, doc, seen, stop } = setup([
      new TypeError('Failed to fetch'),
      404,
      versionTxt(COMMIT_B, 6),
    ])
    await settle()
    doc.visibilityState = 'hidden'
    doc.fire()
    await settle()
    expect(fetchFn).toHaveBeenCalledTimes(1)
    doc.visibilityState = 'visible'
    doc.fire()
    await settle()
    expect(seen).toEqual([])
    doc.fire()
    await settle()
    expect(seen).toEqual([{ commit: COMMIT_B, build: '6' }])
    stop()
    expect(doc.listeners.size).toBe(0)
  })
})

describe('reloadAfterFlush', () => {
  afterEach(() => jest.useRealTimers())

  it('reloads after the flush has finished', async () => {
    const order: string[] = []
    await reloadAfterFlush(
      async () => {
        order.push('flush')
        return true
      },
      () => order.push('reload'),
    )
    expect(order).toEqual(['flush', 'reload'])
  })

  it('reloads after the timeout when the flush hangs, and when it fails', async () => {
    jest.useFakeTimers()
    const reload = jest.fn()
    const done = reloadAfterFlush(
      () => new Promise(() => undefined),
      reload,
      4000,
    )
    await Promise.resolve()
    expect(reload).not.toHaveBeenCalled()
    jest.advanceTimersByTime(4000)
    await done
    expect(reload).toHaveBeenCalledTimes(1)
    jest.useRealTimers()

    const reload2 = jest.fn()
    await reloadAfterFlush(() => Promise.reject(new Error('x')), reload2)
    expect(reload2).toHaveBeenCalledTimes(1)
  })

  it('reloads at once without a research queue', async () => {
    const reload = jest.fn()
    await reloadAfterFlush(null, reload)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
