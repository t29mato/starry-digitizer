import { DigitizerError } from '@/application/errors'
import { AutoService, ExtractionRequest } from './autoService'

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
  credentials?: RequestCredentials
  /** Give up on the capabilities question after this long. Default 3000 ms. */
  capabilitiesTimeoutMs?: number
  /** Give up on calibrate / extract after this long. Default 120000 ms. */
  requestTimeoutMs?: number
  /** For tests and unusual hosts. Default `globalThis.fetch`. */
  fetch?: typeof fetch
}

export const DEFAULT_CAPABILITIES_TIMEOUT_MS = 3000
// INFO: the wpd-auto page waits up to 120 s too (backend README, OCR
// upscale "費用"): a `partial` figure can take ~30 s on CPU.
export const DEFAULT_REQUEST_TIMEOUT_MS = 120000

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
    config.fetch ?? ((input, init) => globalThis.fetch(input, init))
  const requestTimeoutMs = config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const capabilitiesTimeoutMs =
    config.capabilitiesTimeoutMs ?? DEFAULT_CAPABILITIES_TIMEOUT_MS

  const headers = (): Record<string, string> =>
    typeof config.headers === 'function'
      ? config.headers()
      : { ...(config.headers ?? {}) }

  async function request(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller =
      typeof AbortController === 'undefined' ? undefined : new AbortController()
    const timer = setTimeout(() => controller?.abort(), timeoutMs)
    try {
      return await doFetch(url, {
        credentials: config.credentials ?? 'same-origin',
        ...init,
        signal: controller?.signal,
      })
    } catch (error) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        controller?.signal.aborted
          ? `The auto service did not answer within ${timeoutMs / 1000} s`
          : 'The auto service could not be reached',
        error,
      )
    } finally {
      clearTimeout(timer)
    }
  }

  async function postImage(url: string, image: Blob): Promise<unknown> {
    if (isBlockedAsMixedContent(url)) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        'The auto service is http and this page is https; route it through a same-origin relay',
      )
    }
    const response = await request(
      url,
      {
        method: 'POST',
        // INFO: the body is the image bytes themselves, not multipart — the
        // wpd-auto backend refuses multipart on purpose (backend README,
        // "セキュリティ").
        headers: {
          ...headers(),
          'Content-Type': image.type || 'application/octet-stream',
        },
        body: image,
      },
      requestTimeoutMs,
    )
    return readJson(response)
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
      const response = await request(
        capabilitiesUrl,
        { method: 'GET', headers: headers() },
        capabilitiesTimeoutMs,
      )
      const body = await readJson(response)
      const features =
        typeof body === 'object' && body !== null
          ? (body as { features?: unknown }).features
          : undefined
      return Array.isArray(features)
        ? features.filter((f): f is string => typeof f === 'string')
        : []
    },

    calibrate(image) {
      return postImage(`${baseUrl}/calibrate`, image)
    },

    extract(image, extraction: ExtractionRequest) {
      const query = new URLSearchParams({ method: extraction.method })
      if (extraction.area) {
        const { x0, y0, x1, y1 } = extraction.area
        query.set('area', [x0, y0, x1, y1].map(formatNumber).join(','))
      }
      Object.entries(extraction.params ?? {}).forEach(([key, value]) => {
        query.set(key, formatNumber(value))
      })
      return postImage(`${baseUrl}/extract?${query.toString()}`, image)
    },
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
