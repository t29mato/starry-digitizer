import type { DigitizerContext } from '@/application/digitizerContext'
import type {
  ResearchAutoDigitizeEndEvent,
  ResearchAutoPlaceApplyEvent,
  ResearchEvent,
  ResearchExportEvent,
  ResearchExtractionApplyEvent,
} from '@/application/services/researchEvents/researchEvents'
import type { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import type { AxisInterface } from '@/domain/models/axis/axisInterface'
import { POINT_MODE } from '@/constants'

// INFO: The `data` of each record the starryai build sends, built from the
// library's research events and the digitizer's state. Pure functions, so
// the shapes are tested on their own (collectEvents.test.ts) and documented
// in docs/design/starryai-auto.md §3.4. Type names follow wpd-auto's where
// the meaning is the same (backend/COLLECT.md), so the admin report lines
// the two pages up.
//
// Unlike the library's research events, these DO carry the work: axis
// points and values, file names, dataset names. That is the starryai
// build's decision (§10 Q2), made in this host code and shown to the person
// in the notice; the library default (send nothing) is untouched.

export type CollectRecord = { type: string; data: Record<string, unknown> }

/** What the page knows about the window, for `session.start`. */
export function sessionStartData(win: Window): Record<string, unknown> {
  let timezone: string | null = null
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  } catch {
    timezone = null
  }
  return {
    user_agent: win.navigator.userAgent,
    language: win.navigator.language ?? null,
    languages: Array.from(win.navigator.languages ?? []),
    timezone,
    viewport: { width: win.innerWidth, height: win.innerHeight },
    screen: {
      width: win.screen?.width ?? null,
      height: win.screen?.height ?? null,
    },
    device_pixel_ratio: win.devicePixelRatio ?? null,
    path: win.location.pathname,
  }
}

/**
 * The library's own events that are sent as they are (their type, their
 * fields without the envelope). null for the events the host turns into
 * richer records itself (see collectWiring.ts).
 */
export function forwardedResearchEvent(
  event: ResearchEvent,
): CollectRecord | null {
  switch (event.type) {
    case 'auto_place.apply':
    case 'extraction.apply':
    case 'auto_digitize.end':
    case 'export':
      return null
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type, format, version, seq, at, ...data } = event
      return { type, data: { ...data, sd_seq: seq } }
    }
  }
}

export interface CalibrationPoint {
  label: string
  px: number
  py: number
  value: number | null
}

/** An axis set's calibration: its reference points, values and scales. */
export function axisSetCalibration(
  axisSet: AxisSetInterface,
): Record<string, unknown> & { points: CalibrationPoint[] } {
  const fourPoints = axisSet.pointMode === POINT_MODE.FOUR_POINTS
  // INFO: in two-points mode one marker (x2y2) carries both x2 and y2; the
  // values stay on x2 / y2. Recorded as the same four labelled points.
  const pairs: [AxisInterface, AxisInterface][] = [
    [axisSet.x1, axisSet.x1],
    [fourPoints ? axisSet.x2 : axisSet.x2y2, axisSet.x2],
    [axisSet.y1, axisSet.y1],
    [fourPoints ? axisSet.y2 : axisSet.x2y2, axisSet.y2],
  ]
  const points = pairs
    .filter(([marker]) => marker.coordIsFilled)
    .map(([marker, valued]) => ({
      label: valued.name.toUpperCase(),
      px: marker.coord.xPx,
      py: marker.coord.yPx,
      value: Number.isFinite(valued.value) ? valued.value : null,
    }))
  return {
    axis_set: { id: axisSet.id, name: axisSet.name },
    point_mode: fourPoints ? 'four_points' : 'two_points',
    x_log: axisSet.xIsLogScale,
    y_log: axisSet.yIsLogScale,
    consider_tilt: axisSet.considerGraphTilt,
    plot_area: axisSet.plotArea ? { ...axisSet.plotArea } : null,
    points,
  }
}

/** The answer of one auto service call, as the host saw it. */
export interface ServiceCall {
  /** sent as X-WPD-Request-Id: the server's `server.*` record has the same */
  requestId: string
  ms: number
  ok: boolean
  /** what was asked (extract: method, area, params) */
  request: Record<string, unknown> | null
}

export interface ImageView {
  sha256: string | null
  width: number
  height: number
}

/** `calibration.auto`: an Auto-place answer was applied. */
export function calibrationAutoData(
  event: ResearchAutoPlaceApplyEvent,
  axisSet: AxisSetInterface,
  call: ServiceCall | null,
  view: ImageView,
): Record<string, unknown> {
  const calibration = axisSetCalibration(axisSet)
  return {
    request_id: call?.requestId ?? null,
    ms: call?.ms ?? null,
    action: event.action,
    applied: event.axes,
    status: event.status,
    x: event.x,
    y: event.y,
    placement: calibration.points,
    axis_set: calibration.axis_set,
    x_log: calibration.x_log,
    y_log: calibration.y_log,
    plot_area: calibration.plot_area,
    view,
  }
}

/** `extraction.result`: Server Extraction made drafts. */
export function extractionResultData(
  event: ResearchExtractionApplyEvent,
  ctx: Pick<DigitizerContext, 'datasetRepository'>,
  call: ServiceCall | null,
  view: ImageView,
): Record<string, unknown> {
  const drafts = event.datasets.map((id, index) => {
    const dataset = ctx.datasetRepository.datasets.find((d) => d.id === id)
    return {
      series_index: index,
      dataset_id: id,
      name: dataset?.name ?? null,
      points: dataset?.points.length ?? 0,
    }
  })
  return {
    request_id: call?.requestId ?? null,
    ms: call?.ms ?? null,
    method: event.method,
    source: event.source,
    query: call?.request ?? { method: event.method },
    series: event.series,
    points: event.points,
    drafts,
    replaced: event.replaced,
    action: event.action,
    view,
  }
}

/** `auto_digitize.result`: an Auto digitize run ended. */
export function autoDigitizeResultData(
  event: ResearchAutoDigitizeEndEvent,
  calibrate: ServiceCall | null,
  extract: ServiceCall | null,
  view: ImageView,
): Record<string, unknown> {
  return {
    method: event.method,
    outcome: event.status,
    stopped_at: event.stopped_at,
    applied_axes: event.applied_axes,
    series: event.series,
    points: event.points,
    undo_steps: event.undo_steps,
    calibrate_request_id: calibrate?.requestId ?? null,
    extract_request_id: extract?.requestId ?? null,
    view,
  }
}

/** `export`: data left the app. What and how much, never the values. */
export function exportData(
  event: ResearchExportEvent,
  view: ImageView,
): Record<string, unknown> {
  return {
    kind: event.kind,
    scope: event.scope,
    datasets: event.datasets,
    points: event.points,
    view,
  }
}

/**
 * How a calibration came to be, for `calibration.final`: `auto` = exactly
 * what Auto-place placed, `edit` = Auto-place's result changed by hand
 * since, `manual` = no Auto-place on this image and axis set. The
 * arguments are calibrationKey()s.
 */
export function calibrationMode(
  current: string,
  auto: string | null,
): 'auto' | 'edit' | 'manual' {
  if (auto === null) return 'manual'
  return current === auto ? 'auto' : 'edit'
}

/** What decides whether two calibrations are the same. */
export function calibrationKey(axisSet: AxisSetInterface): string {
  const { points, x_log, y_log, point_mode } = axisSetCalibration(axisSet)
  return JSON.stringify([points, x_log, y_log, point_mode])
}
