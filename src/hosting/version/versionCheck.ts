// INFO: F17 of docs/design/starryai-auto.md: the starryai build tells the
// person when a newer deploy is on the server and offers Reload — the same
// approach as the wpd-auto page (a static VERSION.txt, looked at every 5
// minutes and when the tab comes back). That build has no Service Worker
// (STARRY_DIGITIZER_PWA=off, §4.4), so nothing else would ever tell an open
// tab that it is out of date. The Vercel build keeps its PWA update prompt
// (PWAUpdatePrompt.vue) and never runs this.
//
// HOST CODE (src/hosting): not part of the library. Never reloads by itself.

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000
// INFO: the research queue gets this long before the reload; whatever is
// still unsent then goes with the keepalive request of `pagehide`
export const RELOAD_FLUSH_TIMEOUT_MS = 4000

/** What identifies a deploy: VERSION.txt's first line and its build=. */
export interface DeployVersion {
  commit: string | null
  build: string | null
}

const COMMIT_RE = /^[0-9a-f]{7,40}$/
const BUILD_RE = /^[0-9]{1,9}$/

function clean(value: string | null | undefined, re: RegExp): string | null {
  const text = (value ?? '').trim()
  return re.test(text) ? text : null
}

/** The running page's version, from VITE_APP_COMMIT / VITE_APP_BUILD. */
export function runningVersion(
  commit: string | undefined,
  build: string | undefined,
): DeployVersion {
  return { commit: clean(commit, COMMIT_RE), build: clean(build, BUILD_RE) }
}

/**
 * VERSION.txt as deploy/deploy.sh writes it: the commit on the first line,
 * then `version=`, `build=`, `environment=`, `deployed=`. null when neither
 * the commit nor the build can be read (an error page, a half-written file).
 */
export function parseVersionTxt(text: string): DeployVersion | null {
  const lines = text.split(/\r?\n/)
  const commit = clean(lines[0], COMMIT_RE)
  const buildLine = lines.find((line) => line.startsWith('build='))
  const build = clean(buildLine?.slice('build='.length), BUILD_RE)
  if (commit === null && build === null) return null
  return { commit, build }
}

/**
 * Whether the starryai build should look for new versions: it names an auto
 * service, has no Service Worker, and knows its own commit or build (a local
 * build knows neither, and there is nothing to compare with).
 */
export function versionCheckEnabled(options: {
  autoServiceUrl: string | undefined
  pwaOff: boolean
  running: DeployVersion
}): boolean {
  return (
    Boolean(options.autoServiceUrl) &&
    options.pwaOff &&
    (options.running.commit !== null || options.running.build !== null)
  )
}

/** The served deploy differs from the running page (only known parts). */
export function isNewVersion(
  running: DeployVersion,
  served: DeployVersion,
): boolean {
  const differs = (a: string | null, b: string | null) =>
    a !== null && b !== null && a !== b
  return (
    differs(running.commit, served.commit) ||
    differs(running.build, served.build)
  )
}

export interface WatchVersionOptions {
  /** `${BASE_URL}VERSION.txt` */
  url: string
  running: DeployVersion
  /** called once per newly seen deploy */
  onNewVersion(served: DeployVersion): void
  fetch?: typeof fetch
  document?: Document
  intervalMs?: number
  setInterval?: (fn: () => void, ms: number) => unknown
  clearInterval?: (timer: unknown) => void
}

/**
 * Look at VERSION.txt now, every `intervalMs` and whenever the tab becomes
 * visible. Failures are silent (the next look tries again). Returns stop().
 */
export function watchVersion(options: WatchVersionOptions): () => void {
  const fetchFn: typeof fetch =
    options.fetch ?? ((input, init) => fetch(input, init))
  const doc =
    options.document ?? (typeof document === 'undefined' ? undefined : document)
  const setTimer =
    options.setInterval ?? ((fn, ms) => setInterval(fn, ms) as unknown)
  const clearTimer =
    options.clearInterval ??
    ((timer) => clearInterval(timer as ReturnType<typeof setInterval>))
  let stopped = false
  let busy = false
  let reported: string | null = null

  const check = async () => {
    if (stopped || busy) return
    busy = true
    try {
      // INFO: no-store: an hour-old copy from the HTTP cache would hide
      // exactly the deploy this is looking for
      const response = await fetchFn(options.url, { cache: 'no-store' })
      if (!response.ok) return
      const served = parseVersionTxt(await response.text())
      if (stopped || !served || !isNewVersion(options.running, served)) return
      const key = `${served.commit}#${served.build}`
      if (key === reported) return
      reported = key
      options.onNewVersion(served)
    } catch {
      // INFO: offline, the server restarting: the next look tries again
    } finally {
      busy = false
    }
  }
  const onVisibility = () => {
    if (doc?.visibilityState === 'visible') void check()
  }
  const timer = setTimer(
    () => void check(),
    options.intervalMs ?? VERSION_CHECK_INTERVAL_MS,
  )
  doc?.addEventListener('visibilitychange', onVisibility)
  void check()
  return () => {
    stopped = true
    clearTimer(timer)
    doc?.removeEventListener('visibilitychange', onVisibility)
  }
}

/**
 * Reload after giving the research queue up to `timeoutMs` to be sent. The
 * flush's own outcome does not matter: the reload happens either way.
 */
export async function reloadAfterFlush(
  flush: (() => Promise<unknown>) | null,
  reload: () => void,
  timeoutMs = RELOAD_FLUSH_TIMEOUT_MS,
): Promise<void> {
  if (flush) {
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      flush().catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, timeoutMs)
      }),
    ])
    clearTimeout(timer)
  }
  reload()
}
