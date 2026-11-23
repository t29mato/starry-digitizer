import { DigitizerContext } from '@/application/digitizerContext'
import {
  AutoFeature,
  AutoService,
  isAutoFeature,
} from '@/application/services/autoService/autoService'
import {
  createHttpAutoService,
  DEFAULT_CAPABILITIES_TIMEOUT_MS,
  HttpAutoServiceConfig,
} from '@/application/services/autoService/httpAutoService'
import {
  AutoComponentsInfo,
  parseAutoStatusResponse,
  parseComponentsResponse,
  parseExtractionMethodsResponse,
} from '@/application/services/autoService/autoServiceWire'
import { DigitizerError } from '@/application/errors'

// INFO: Turning the server-side automatic features on for one digitizer, and
// deciding which of them to show. docs/design/auto-service.md.
//
// THE RULE (Starrydata2 v4 board P5): the features are shown only when the
// backend says so. Not reachable, 401 / 403 / 404 / 5xx, a timeout, a body
// that is not the documented shape — every one of those means "show
// nothing", silently. No error event, no message: to a user the backend does
// not allow, the features simply do not exist. The decision is the server's;
// nothing here looks at the user's IP, host name or location.

export type AutoServiceOption = AutoService | HttpAutoServiceConfig

function isAutoService(value: AutoServiceOption): value is AutoService {
  return (
    typeof (value as AutoService).capabilities === 'function' &&
    typeof (value as AutoService).calibrate === 'function' &&
    typeof (value as AutoService).extract === 'function'
  )
}

/**
 * Configure (or, with null / undefined, remove) the auto service of `ctx` and
 * ask it which features to show. Resolves when the answer is in; never
 * rejects.
 */
export async function configureAutoService(
  ctx: DigitizerContext,
  option: AutoServiceOption | null | undefined,
): Promise<void> {
  const service = option
    ? isAutoService(option)
      ? option
      : createHttpAutoService(option)
    : null
  ctx.autoFeatures.setService(service)
  if (service) await refreshAutoFeatures(ctx)
}

/**
 * Ask the configured service again (e.g. after the user signed in on the
 * host). Never rejects; any failure leaves the feature list empty.
 */
export async function refreshAutoFeatures(
  ctx: DigitizerContext,
  timeoutMs = DEFAULT_CAPABILITIES_TIMEOUT_MS,
): Promise<AutoFeature[]> {
  const { autoFeatures } = ctx
  const service = autoFeatures.service
  if (!service) {
    autoFeatures.setFeatures([])
    return []
  }
  let features: AutoFeature[] = []
  const status = refreshAutoStatus(ctx)
  try {
    const answer = await withTimeout(service.capabilities(), timeoutMs)
    features = Array.isArray(answer)
      ? Array.from(new Set(answer.filter(isAutoFeature)))
      : []
  } catch {
    // INFO: deliberately silent — see THE RULE above
    features = []
  }
  await status
  // INFO: a newer configureAutoService() call has replaced the service while
  // this answer was in flight; it is not ours to apply any more
  if (autoFeatures.service !== service) return autoFeatures.features
  autoFeatures.setFeatures(features)
  return features
}

/**
 * Ask the service for the methods' details and the supported hours, if it
 * can tell (`methods()` / `status()` are optional). Never rejects: details
 * that cannot be had are simply not shown.
 */
export async function refreshAutoStatus(ctx: DigitizerContext): Promise<void> {
  const { autoFeatures } = ctx
  const service = autoFeatures.service
  if (!service) return
  try {
    if (service.methods) {
      const { methods, hours } = parseExtractionMethodsResponse(
        await service.methods(),
      )
      if (autoFeatures.service === service)
        autoFeatures.setStatus(methods, hours)
    } else if (service.status) {
      const hours = parseAutoStatusResponse(await service.status())
      if (autoFeatures.service === service) autoFeatures.setStatus(null, hours)
    }
  } catch {
    // INFO: silent, as the capabilities question — see THE RULE above
  }
}

/** True when the configured service can list its components (F14). */
export function canListAutoComponents(ctx: DigitizerContext): boolean {
  return typeof ctx.autoFeatures.service?.components === 'function'
}

/**
 * Ask the service which engines, models and tools it uses, with their
 * versions (`GET /components`; docs/design/starryai-auto.md F14). Read on
 * demand only and never stored: it is a developer's read-out, not project
 * data. Unlike the capabilities question this one REJECTS on failure, because
 * the person opened the list on purpose and should see why it is empty.
 *
 * @throws {DigitizerError} `AUTO_SERVICE_FAILED` when there is no service,
 * it cannot list its components, the call fails or the answer has no list.
 */
export async function loadAutoComponents(
  ctx: DigitizerContext,
): Promise<AutoComponentsInfo> {
  const service = ctx.autoFeatures.service
  if (!service?.components) {
    throw new DigitizerError(
      'AUTO_SERVICE_FAILED',
      'The auto service cannot list its components',
    )
  }
  return parseComponentsResponse(await service.components())
}

/**
 * The sentence to add to an automatic feature's failure when the server
 * says it is outside the supported hours; '' otherwise. Only added to a
 * failure: outside the hours nothing is refused, and most features still
 * answer.
 */
export function outsideHoursNote(ctx: DigitizerContext): string {
  const { hours } = ctx.autoFeatures
  if (!hours || hours.available || !hours.hours) return ''
  const zone = hours.timezone ? ` (${hours.timezone})` : ''
  return `Automatic features are supported ${hours.hours.replace(
    '-',
    '–',
  )}${zone}; outside those hours some of them are off.`
}

export const AUTO_STATUS_INTERVAL_MS = 5 * 60 * 1000
// INFO: a little after next_change, so the server has switched (LineFormer
// started or stopped by its timer) when it is asked
const AFTER_CHANGE_MS = 5000

/**
 * Keep the features and the hours current while the page is open: every
 * 5 minutes, just after the next change of the hours, and when the tab is
 * shown again. For a host that keeps a page open all day (the starryai
 * build); the library itself never starts this. Returns the stop function.
 */
export function watchAutoStatus(
  ctx: DigitizerContext,
  intervalMs = AUTO_STATUS_INTERVAL_MS,
  now: () => number = Date.now,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  const schedule = () => {
    if (stopped) return
    if (timer) clearTimeout(timer)
    let delay = intervalMs
    const next = ctx.autoFeatures.hours?.nextChange
    const at = next ? Date.parse(next) : NaN
    if (Number.isFinite(at)) {
      delay = Math.min(delay, Math.max(0, at - now()) + AFTER_CHANGE_MS)
    }
    timer = setTimeout(refresh, delay)
  }
  const refresh = () => {
    refreshAutoFeatures(ctx).finally(schedule)
  }
  const onVisible = () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    ) {
      refresh()
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisible)
  }
  schedule()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }
}

// INFO: on top of the HTTP timeout, because a host-provided service need not
// have one — and a capabilities question that never settles must still end
// with the features hidden, not with a panel waiting forever.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('capabilities timed out')),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * The service, if `feature` may be used right now; throws otherwise. Used by
 * the explicit actions (Auto-place, Extract), where the user pressed a button
 * and a refusal must be said rather than swallowed.
 */
export function requireAutoFeature(
  ctx: DigitizerContext,
  feature: AutoFeature,
): AutoService {
  const service = ctx.autoFeatures.service
  if (!service || !ctx.autoFeatures.has(feature)) {
    throw new DigitizerError(
      'AUTO_SERVICE_FAILED',
      `The automatic feature "${feature}" is not available`,
    )
  }
  return service
}

/** The loaded image as a Blob for the service. */
export function currentImageBlob(ctx: DigitizerContext): Blob {
  const dataUrl = ctx.canvasHandler.uploadImageUrl
  if (!dataUrl) {
    throw new DigitizerError('AUTO_SERVICE_FAILED', 'No image loaded')
  }
  return dataUrlToBlob(dataUrl)
}

// INFO: decoded here rather than with `fetch(dataUrl)` (imageLoader's
// dataUrlToBlob): a host's fetch may be wrapped (auth, logging, a service
// worker) and has no business seeing a multi-megabyte data URL.
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) {
    throw new DigitizerError(
      'AUTO_SERVICE_FAILED',
      'The image is not a data URL',
    )
  }
  const header = dataUrl.slice(5, comma)
  const data = dataUrl.slice(comma + 1)
  const mime = header.split(';')[0] || 'application/octet-stream'
  if (!header.split(';').includes('base64')) {
    return new Blob([decodeURIComponent(data)], { type: mime })
  }
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

// INFO: an Auto-place / Extract answer belongs to the image it was asked
// for. When the image changes while the request is in flight (a new upload,
// a project import), the answer must not be applied to the new image: the
// panel aborts its signal, the service may cancel the request, and even a
// service that ignores the signal has its late answer dropped by settle().
const IMAGE_CHANGED = 'image_changed'

/**
 * The image a request is for, and the check to run when its answer is in.
 * `settle()` throws (DigitizerError AUTO_SERVICE_FAILED, see
 * isImageChangedError) when `signal` was aborted or the loaded image is no
 * longer the one the request was made for.
 */
export function bindToCurrentImage(
  ctx: DigitizerContext,
  signal?: AbortSignal,
): { image: Blob; settle(): void } {
  const url = ctx.canvasHandler.uploadImageUrl
  const image = currentImageBlob(ctx)
  const settle = () => {
    if (signal?.aborted || ctx.canvasHandler.uploadImageUrl !== url) {
      throw new DigitizerError(
        'AUTO_SERVICE_FAILED',
        'The image changed while the auto service was working; its answer was discarded',
        { reason: IMAGE_CHANGED },
      )
    }
  }
  settle()
  return { image, settle }
}

/** True for the error settle() throws: a cancel, not a service failure. */
export function isImageChangedError(error: unknown): boolean {
  const cause =
    typeof error === 'object' && error !== null
      ? (error as { cause?: unknown }).cause
      : undefined
  return (
    typeof cause === 'object' &&
    cause !== null &&
    (cause as { reason?: unknown }).reason === IMAGE_CHANGED
  )
}
