import { watch } from 'vue'
import type { DigitizerContext } from '@/application/digitizerContext'
import type {
  AutoRequestOptions,
  AutoService,
  ExtractionRequest,
} from '@/application/services/autoService/autoService'
import {
  createHttpAutoService,
  type HttpAutoServiceConfig,
} from '@/application/services/autoService/httpAutoService'
import type { ResearchEvent } from '@/application/services/researchEvents/researchEvents'
import { configureResearchEvents } from '@/application/utils/researchEventOperations'
import { CollectClient } from './collectClient'
import { randomUuid } from './collectStorage'
import {
  ImageView,
  ServiceCall,
  autoDigitizeResultData,
  axisSetCalibration,
  calibrationAutoData,
  calibrationKey,
  calibrationMode,
  exportData,
  extractionResultData,
  forwardedResearchEvent,
  sessionStartData,
} from './collectEvents'

// INFO: Connects one digitizer (its DigitizerContext) to a CollectClient:
// the library's research events, the image on the canvas and the axis
// calibration become records. Everything is read from the outside — the
// research-event hook, the reactive context and a wrapper around the auto
// service — so the library needs no knowledge of collection.

/** The last calibrate / extract call, for linking records to `server.*`. */
export interface ServiceCalls {
  calibrate: ServiceCall | null
  extract: ServiceCall | null
}

export type CollectingServiceConfig = Omit<HttpAutoServiceConfig, 'headers'>

/**
 * The HTTP auto service, with this page's collect headers on every request
 * and an `X-WPD-Request-Id` of its own on each calibrate / extract, so the
 * server's `server.calibrate` / `server.extract` records join the page's.
 */
export function createCollectingAutoService(
  client: Pick<CollectClient, 'headers'>,
  config: CollectingServiceConfig,
  calls: ServiceCalls,
  now: () => number = () => Date.now(),
): AutoService {
  const base = createHttpAutoService({
    ...config,
    headers: () => client.headers(),
  })
  // INFO: one service per call, so each request carries its own id even
  // when two are in flight (creating one is a handful of closures)
  const withId = (requestId: string) =>
    createHttpAutoService({
      ...config,
      headers: () => ({
        ...client.headers(),
        'X-WPD-Request-Id': requestId,
      }),
    })
  async function timed(
    which: keyof ServiceCalls,
    request: Record<string, unknown> | null,
    run: (service: AutoService) => Promise<unknown>,
  ): Promise<unknown> {
    const requestId = randomUuid()
    const t0 = now()
    const record = (ok: boolean) => {
      calls[which] = { requestId, ms: now() - t0, ok, request }
    }
    try {
      const body = await run(withId(requestId))
      record(true)
      return body
    } catch (error) {
      record(false)
      throw error
    }
  }
  // INFO: every route the page uses goes through here (and so carries the
  // headers, the token among them): the legend reader and the components
  // list too, which the wrapper had lost when the branches were merged
  return {
    capabilities: () => base.capabilities(),
    methods: () => (base.methods ? base.methods() : Promise.resolve(null)),
    status: () => (base.status ? base.status() : Promise.resolve(null)),
    components: base.components?.bind(base),
    legend: base.legend?.bind(base),
    calibrate(image: Blob, options?: AutoRequestOptions) {
      return timed('calibrate', null, (service) =>
        options ? service.calibrate(image, options) : service.calibrate(image),
      )
    },
    extract(
      image: Blob,
      request: ExtractionRequest,
      options?: AutoRequestOptions,
    ) {
      const query = {
        method: request.method,
        area: request.area ?? null,
        params: request.params ?? {},
      }
      return timed('extract', query, (service) =>
        options
          ? service.extract(image, request, options)
          : service.extract(image, request),
      )
    },
  }
}

export interface CollectWiringOptions {
  window?: Window
  /** wait this long after the last axis change before `calibration.final` */
  calibrationDebounceMs?: number
}

/** The image on the canvas, as a work's `files` entry names it. */
export interface CurrentImage {
  sha256: string
  name: string | null
  type: string
  size: number
}

export interface CollectWiring {
  /** the person loaded this file (ImageSettings' `image-replaced`) */
  noteFile(file: Blob): void
  /** the image on the canvas now; null = none (or not looked at yet) */
  currentImage(): CurrentImage | null
  /** record what is pending now (the tab is being hidden) */
  flushPending(): void
  detach(): void
}

export const CALIBRATION_DEBOUNCE_MS = 2000

export function attachCollector(
  ctx: DigitizerContext,
  client: CollectClient,
  calls: ServiceCalls,
  options: CollectWiringOptions = {},
): CollectWiring {
  const win =
    options.window ?? (typeof window === 'undefined' ? undefined : window)
  const debounceMs = options.calibrationDebounceMs ?? CALIBRATION_DEBOUNCE_MS
  let view: ImageView = { sha256: null, width: 0, height: 0 }
  let image: CurrentImage | null = null
  let pendingFile: { name: string; size: number; type: string } | null = null
  // INFO: per axis set, for the current image: what Auto-place placed
  // (calibrationKey) and its request, and what was last recorded as final
  let autoPlaced = new Map<number, { key: string; requestId: string | null }>()
  let finalSent = new Map<number, string>()
  let calibrationTimer: ReturnType<typeof setTimeout> | null = null

  if (win) client.record('session.start', sessionStartData(win))

  const onResearchEvent = (event: ResearchEvent) => {
    const forwarded = forwardedResearchEvent(event)
    if (forwarded) {
      client.record(forwarded.type, forwarded.data)
      return
    }
    switch (event.type) {
      case 'auto_place.apply': {
        const axisSet = ctx.axisSetRepository.activeAxisSet
        const requestId = calls.calibrate?.requestId ?? null
        autoPlaced.set(axisSet.id, { key: calibrationKey(axisSet), requestId })
        client.record(
          'calibration.auto',
          calibrationAutoData(event, axisSet, calls.calibrate, view),
        )
        break
      }
      case 'extraction.apply':
        client.record(
          'extraction.result',
          extractionResultData(event, ctx, calls.extract, view),
        )
        break
      case 'auto_digitize.end':
        client.record(
          'auto_digitize.result',
          autoDigitizeResultData(event, calls.calibrate, calls.extract, view),
        )
        break
      case 'export':
        client.record('export', exportData(event, view))
        break
    }
  }
  configureResearchEvents(ctx, onResearchEvent)

  // --- the image ----------------------------------------------------------
  // INFO: looked at one task later: ImageSettings emits `image-replaced`
  // (the file, with its name) only after the canvas has the new image, so
  // noteFile() comes in between
  let imageTimer: ReturnType<typeof setTimeout> | null = null
  const takeImage = () => {
    imageTimer = null
    const url = ctx.canvasHandler.uploadImageUrl
    const decoded = url ? decodeDataUrl(url) : null
    if (!decoded) {
      view = { sha256: null, width: 0, height: 0 }
      image = null
      return
    }
    const file =
      pendingFile && pendingFile.size === decoded.bytes.length
        ? pendingFile
        : null
    pendingFile = null
    const width = ctx.canvasHandler.originalWidth
    const height = ctx.canvasHandler.originalHeight
    const sha256 = client.addImage(decoded.bytes, {
      type: file?.type || decoded.type,
      name: file?.name ?? null,
      width,
      height,
    })
    view = { sha256, width, height }
    image = sha256
      ? {
          sha256,
          name: file?.name || null,
          type: file?.type || decoded.type,
          size: decoded.bytes.length,
        }
      : null
  }
  const stopImage = watch(
    () => ctx.canvasHandler.uploadImageUrl,
    () => {
      autoPlaced = new Map()
      finalSent = new Map()
      if (imageTimer !== null) clearTimeout(imageTimer)
      imageTimer = setTimeout(takeImage, 0)
    },
    { immediate: true },
  )

  // --- the calibration ------------------------------------------------------
  const recordCalibrations = () => {
    calibrationTimer = null
    ctx.axisSetRepository.axisSets.forEach((axisSet) => {
      const key = calibrationKey(axisSet)
      if (finalSent.get(axisSet.id) === key) return
      finalSent.set(axisSet.id, key)
      const calibration = axisSetCalibration(axisSet)
      // INFO: an emptied axis set (a new image) is no calibration
      if (calibration.points.length === 0) return
      const auto = autoPlaced.get(axisSet.id) ?? null
      client.record('calibration.final', {
        mode: calibrationMode(key, auto?.key ?? null),
        auto_request_id: auto?.requestId ?? null,
        ...calibration,
        view,
      })
    })
  }
  const stopCalibration = watch(
    () => ctx.axisSetRepository.axisSets.map(calibrationKey).join('|'),
    () => {
      if (calibrationTimer !== null) clearTimeout(calibrationTimer)
      calibrationTimer = setTimeout(recordCalibrations, debounceMs)
    },
  )

  const flushPending = () => {
    if (imageTimer !== null) {
      clearTimeout(imageTimer)
      takeImage()
    }
    if (calibrationTimer !== null) {
      clearTimeout(calibrationTimer)
      recordCalibrations()
    }
    client.flushOnHide()
  }
  const onVisibility = () => {
    if (win?.document.visibilityState === 'hidden') flushPending()
  }
  win?.addEventListener('pagehide', flushPending)
  win?.document.addEventListener('visibilitychange', onVisibility)

  return {
    noteFile(file: Blob) {
      pendingFile = {
        name: (file as File).name ?? '',
        size: file.size,
        type: file.type,
      }
    },
    currentImage() {
      // INFO: an image change not looked at yet is looked at now, so a
      // project is never sent with the previous image's sha256
      if (imageTimer !== null) {
        clearTimeout(imageTimer)
        takeImage()
      }
      return image
    },
    flushPending,
    detach() {
      stopImage()
      stopCalibration()
      if (imageTimer !== null) clearTimeout(imageTimer)
      if (calibrationTimer !== null) clearTimeout(calibrationTimer)
      configureResearchEvents(ctx, null)
      win?.removeEventListener('pagehide', flushPending)
      win?.document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}

/** The bytes and media type of a data URL; null if it is not one. */
export function decodeDataUrl(
  url: string,
): { bytes: Uint8Array; type: string } | null {
  const comma = url.indexOf(',')
  if (!url.startsWith('data:') || comma === -1) return null
  const header = url.slice(5, comma)
  const type = header.split(';')[0] || 'application/octet-stream'
  try {
    if (!header.split(';').includes('base64')) {
      return {
        bytes: Uint8Array.from(
          utf8Bytes(decodeURIComponent(url.slice(comma + 1))),
        ),
        type,
      }
    }
    const binary = atob(url.slice(comma + 1))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { bytes, type }
  } catch {
    return null
  }
}

// INFO: a non-base64 data URL is rare (an SVG at most); its text as UTF-8
function utf8Bytes(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000)
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63),
      )
  }
  return out
}
