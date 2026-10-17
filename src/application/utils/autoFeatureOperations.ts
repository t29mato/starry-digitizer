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
  try {
    const answer = await withTimeout(service.capabilities(), timeoutMs)
    features = Array.isArray(answer)
      ? Array.from(new Set(answer.filter(isAutoFeature)))
      : []
  } catch {
    // INFO: deliberately silent — see THE RULE above
    features = []
  }
  // INFO: a newer configureAutoService() call has replaced the service while
  // this answer was in flight; it is not ours to apply any more
  if (autoFeatures.service !== service) return autoFeatures.features
  autoFeatures.setFeatures(features)
  return features
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
