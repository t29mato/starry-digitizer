import { DigitizerError } from '@/application/errors'
import {
  AutoRequestOptions,
  AutoService,
  ExtractionRequest,
} from './autoService'

// INFO: The default AutoService: plain HTTP to a wpd-auto compatible API.
// Everything about WHERE it talks to comes from the host — nothing is
// hard-coded here — so the same build works against the wpd-auto backend
// directly (an http origin, reachable only from inside NIMS) and against a
// relay on the host's own backend (same origin, https). Switching between the
// two is changing `baseUrl`. docs/design/auto-service.md.

export interface HttpAutoServiceConfig {
  /**
   * Root of the API, WITHOUT a trailing slash. The requests are
   * `POST {baseUrl}/calibrate` and `POST {baseUrl}/extract?…`, the same paths
   * as the wpd-auto backend's `/api/v1/…`. Examples:
   * `'/api/v4/digitizer-auto'` (a relay on the host), or
   * `'http://example.internal/wpd-auto/api/v1'` (the backend itself).
   */
  baseUrl: string
  /**
   * Where to ask which features this user may see. Default
   * `{baseUrl}/capabilities`. The answer is `{ "features": [...] }`.
   */
  capabilitiesUrl?: string
  /**
   * The answer to the capabilities question, when the host already knows it
   * (it asked its own backend, or decided server-side and rendered it into
   * the page). Given = no capabilities request is made.
   */
  features?: readonly string[]
  /** Extra request headers (e.g. a CSRF token for a same-origin relay). */
  headers?: Record<string, string> | (() => Record<string, string>)
  /** fetch `credentials`. Default 'same-origin'. */
  credentials?: 'include' | 'omit' | 'same-origin'
  /** Give up on the capabilities question after this long. Default 3000 ms. */
  capabilitiesTimeoutMs?: number
  /** Give up on calibrate / extract after this long. Default 120000 ms. */
  requestTimeoutMs?: number
  /** Give up on the legend reader after this long. Default 20000 ms. */
  legendTimeoutMs?: number
  /**
   * How long calibrate / extract keep retrying while the service is
   * restarting or busy (502/503/504, unreachable), in waits of 1, 2, 4, …
   * seconds (a `Retry-After` wins). Default 30000 ms; 0 = no retry.
   */
  retryBudgetMs?: number
  /** For tests. Default: setTimeout. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  /** For tests and unusual hosts. Default: the global `fetch`. */
  fetch?: typeof fetch
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>

export const DEFAULT_CAPABILITIES_TIMEOUT_MS = 3000
// INFO: the wpd-auto page waits up to 120 s too (backend README, OCR
// upscale "費用"): a `partial` figure can take ~30 s on CPU.
export const DEFAULT_REQUEST_TIMEOUT_MS = 120000
// INFO: the wpd-auto page retries a restarting backend for about 30 s too
// (a deploy restarts it and waits for /healthz); longer than that, the
// person is better off with the error and the button.
export const DEFAULT_RETRY_BUDGET_MS = 30000
// INFO: extract/methods asks the LineFormer service's /healthz (2 s upper
// bound, backend README) before it answers
export const DEFAULT_STATUS_TIMEOUT_MS = 10000
// INFO: the backend ends a legend pass within its wait (3 s) + timeout
// (15 s) and answers `timeout` itself by 21 s (backend README, POST
// /api/v1/legend). Giving up at 20 s loses only answers that would have been
// a `timeout` anyway; either way the drafts just keep their names.
export const DEFAULT_LEGEND_TIMEOUT_MS = 20000
// INFO: 503s that say "this will not change by waiting" (backend README,
// "API"): the engine or method is not installed or its service is down.
const PERMANENT_503 = ['engine_unavailable', 'method_unavailable']

type RequestFailure = 'cancelled' | 'timeout' | 'unreachable'

class RequestFailed extends Error {
  constructor(
    readonly kind: RequestFailure,
    readonly cause: unknown,
  ) {
    super(kind)
  }
}

/**
 * True when a page served over https would be blocked from calling `url`
 * (mixed content). Checked up front so the features are hidden quietly
 * instead of the browser logging a blocked request on every page load.
 */
export function isBlockedAsMixedContent(
  url: string,
  pageHref: string | undefined = typeof window === 'undefined'
    ? undefined
    : window.location.href,
): boolean {
  if (!pageHref) return false
  const page = new URL(pageHref)
  const target = new URL(url, pageHref)
  return page.protocol === 'https:' && target.protocol === 'http:'
}

export function createHttpAutoService(
  config: HttpAutoServiceConfig,
): AutoService {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const capabilitiesUrl = config.capabilitiesUrl ?? `${baseUrl}/capabilities`
  // INFO: looked up at call time, so a test double installed on globalThis
  // after this service was created is still the one used
  const doFetch: typeof fetch =
    config.fetch ?? ((input, init) => fetch(input, init))
  const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const capabilitiesTimeoutMs =
    config.capabilitiesTimeoutMs ?? DEFAULT_CAPABILITIES_TIMEOUT_MS
  const retryBudgetMs = config.retryBudgetMs ?? DEFAULT_RETRY_BUDGET_MS
  const sleep = config.sleep ?? defaultSleep

  const headers = (): Record<string, string> =>
    typeof config.headers === 'function'
      ? config.headers()
      : { ...(config.headers ?? {}) }

  async function request(
    url: string,
    init: FetchInit,
    timeoutMs: number,
    cancel?: AbortSignal,
  ): Promise<Response> {
    const controller =
      typeof AbortController === 'undefined' ? undefined : new AbortController()
    const timer = setTimeout(() => controller?.abort(), timeoutMs)
    // INFO: the caller's signal (the image changed, the panel went away)
    // aborts the same fetch as the timeout
    const onCancel = () => controller?.abort()
    if (cancel?.aborted) onCancel()
    else cancel?.addEventListener('abort', onCancel)
    try {
      return await doFetch(url, {
        credentials: config.credentials ?? 'same-origin',
        ...init,
        signal: controller?.signal,
      })
    } catch (error) {
      throw new RequestFailed(
        cancel?.aborted
          ? 'cancelled'
          : controller?.signal.aborted
          ? 'timeout'
          : 'unreachable',
        error,
      )
    } finally {
      clearTimeout(timer)
      cancel?.removeEventListener('abort', onCancel)
    }
  }

  async function postImage(
    url: string,
    image: Blob,
    options: AutoRequestOptions = {},
  ): Promise<unknown> {
    if (isBlockedAsMixedContent(url)) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        'The auto service is http and this page is https; route it through a same-origin relay',
      )
    }
    const init: FetchInit = {
      method: 'POST',
      // INFO: the body is the image bytes themselves, not multipart — the
      // wpd-auto backend refuses multipart on purpose (backend README,
      // "セキュリティ").
      headers: {
        ...headers(),
        'Content-Type': image.type || 'application/octet-stream',
      },
      body: image,
    }
    let waited = 0
    for (let attempt = 0; ; attempt++) {
      let wait: number | null
      try {
        const response = await request(
          url,
          init,
          requestTimeoutMs,
          options.signal,
        )
        wait = await retryWait(response, attempt, retryBudgetMs - waited)
        if (wait === null) return readJson(response)
      } catch (error) {
        if (!(error instanceof RequestFailed)) throw error
        // INFO: a timeout is not retried: the request may still be running
        // on the server, and a second one would only queue behind it
        if (error.kind !== 'unreachable')
          throw failureError(error, requestTimeoutMs)
        wait = backoff(attempt)
        if (waited + wait > retryBudgetMs)
          throw failureError(error, requestTimeoutMs)
      }
      waited += wait
      await sleep(wait, options.signal)
      if (options.signal?.aborted) {
        throw failureError(
          new RequestFailed('cancelled', null),
          requestTimeoutMs,
        )
      }
    }
  }

  async function getJson(url: string): Promise<unknown> {
    if (isBlockedAsMixedContent(url)) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        'The auto service is http and this page is https',
      )
    }
    try {
      const response = await request(
        url,
        { method: 'GET', headers: headers() },
        DEFAULT_STATUS_TIMEOUT_MS,
      )
      return await readJson(response)
    } catch (error) {
      throw error instanceof RequestFailed
        ? failureError(error, DEFAULT_STATUS_TIMEOUT_MS)
        : error
    }
  }

  // INFO: null = use this answer (success, or an error waiting will not fix,
  // or the budget is spent); a number = wait that long and ask again.
  async function retryWait(
    response: Response,
    attempt: number,
    remainingMs: number,
  ): Promise<number | null> {
    if (![502, 503, 504].includes(response.status)) return null
    if (response.status === 503) {
      const code = await peekErrorCode(response)
      if (code && PERMANENT_503.includes(code)) return null
    }
    const after = Number(response.headers?.get?.('Retry-After'))
    const wait = after > 0 ? after * 1000 : backoff(attempt)
    return wait <= remainingMs ? wait : null
  }

  return {
    async capabilities() {
      if (config.features) return [...config.features]
      if (isBlockedAsMixedContent(capabilitiesUrl)) {
        console.warn(
          '[starry-digitizer] auto service not used: an https page cannot call an http service',
        )
        return []
      }
      let response: Response
      try {
        response = await request(
          capabilitiesUrl,
          { method: 'GET', headers: headers() },
          capabilitiesTimeoutMs,
        )
      } catch (error) {
        throw error instanceof RequestFailed
          ? failureError(error, capabilitiesTimeoutMs)
          : error
      }
      const body = await readJson(response)
      const features =
        typeof body === 'object' && body !== null
          ? (body as { features?: unknown }).features
          : undefined
      return Array.isArray(features)
        ? features.filter((f): f is string => typeof f === 'string')
        : []
    },

    methods() {
      return getJson(`${baseUrl}/extract/methods`)
    },

    status() {
      return getJson(`${baseUrl}/auto/status`)
    },

    components() {
      return getJson(`${baseUrl}/components`)
    },

    // INFO: no retry: the legend only names drafts, a busy reader answers
    // 200 `busy` by itself, and a second request would queue behind the first
    async legend(body, options = {}) {
      const url = `${baseUrl}/legend`
      if (isBlockedAsMixedContent(url)) {
        throw new DigitizerError(
          'AUTO_SERVICE_FAILED',
          'The auto service is http and this page is https',
        )
      }
      const timeoutMs = config.legendTimeoutMs ?? DEFAULT_LEGEND_TIMEOUT_MS
      try {
        const response = await request(
          url,
          {
            method: 'POST',
            headers: { ...headers(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
          timeoutMs,
          options.signal,
        )
        return await readJson(response)
      } catch (error) {
        throw error instanceof RequestFailed
          ? failureError(error, timeoutMs)
          : error
      }
    },

    calibrate(image, options) {
      // INFO: an X-Y plot sends no `plot`, so the request is the same as
      // before bar plots existed (and an older backend is not asked a
      // question it does not know)
      const query = options?.plot === 'bar' ? '?plot=bar' : ''
      return postImage(`${baseUrl}/calibrate${query}`, image, options)
    },

    extract(image, extraction: ExtractionRequest, options) {
      const query = new URLSearchParams({ method: extraction.method })
      if (extraction.area) {
        const { x0, y0, x1, y1 } = extraction.area
        query.set('area', [x0, y0, x1, y1].map(formatNumber).join(','))
      }
      Object.entries(extraction.params ?? {}).forEach(([key, value]) => {
        query.set(key, formatNumber(value))
      })
      return postImage(`${baseUrl}/extract?${query.toString()}`, image, options)
    },
  }
}

function failureError(
  failure: RequestFailed,
  timeoutMs: number,
): DigitizerError {
  return new DigitizerError(
    'AUTO_SERVICE_FAILED',
    failure.kind === 'cancelled'
      ? 'The request to the auto service was cancelled'
      : failure.kind === 'timeout'
      ? `The auto service did not answer within ${timeoutMs / 1000} s`
      : 'The auto service could not be reached',
    failure.cause,
  )
}

function backoff(attempt: number): number {
  return 1000 * 2 ** attempt
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms)
    signal?.addEventListener('abort', done)
    function done() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
  })
}

// INFO: reads the error code without consuming the body that readJson()
// will read when the answer is used as it is
async function peekErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = await (response.clone?.() ?? response).json()
    return typeof body?.error === 'string' ? body.error : undefined
  } catch {
    return undefined
  }
}

function formatNumber(value: number): string {
  // INFO: area / thresholds do not need more than 4 decimals, and a value
  // like 0.30000000000000004 in a URL is just noise in the server logs
  return String(Math.round(value * 10000) / 10000)
}

async function readJson(response: Response): Promise<unknown> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch (error) {
    if (response.ok) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        'The auto service answered with something that is not JSON',
        error,
      )
    }
  }
  if (!response.ok) {
    throw new DigitizerError(
      'AUTO_SERVICE_FAILED',
      describeHttpError(response.status, body),
      body,
    )
  }
  return body
}

// INFO: the backend's errors are `{ error: code, detail?, reason? }`
// (backend README, "API"). Shown to the user who pressed the button, so say
// what happened in their terms first and keep the code for the bug report.
function describeHttpError(status: number, body: unknown): string {
  const record =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {}
  const code = typeof record.error === 'string' ? record.error : undefined
  const reason = typeof record.reason === 'string' ? record.reason : undefined
  const detail = typeof record.detail === 'string' ? record.detail : undefined
  const what = code ? `, ${code}${reason ? `: ${reason}` : ''}` : ''
  const summary = `The auto service failed (HTTP ${status}${what})`
  return detail ? `${summary} — ${detail}` : summary
}
