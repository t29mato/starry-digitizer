import { DigitizerError } from '@/application/errors'
import { Rect } from '@/@types/types'
import { AxisScale } from '@/domain/services/axisTickFitter'

// INFO: Validation and conversion of the wpd-auto backend's response bodies
// (backend README, "API") into the digitizer's own terms. Pure functions: no
// network, no state, so every odd answer can be pinned down in Jest.
//
// PIXEL CONVENTION. The digitizer puts the origin at the top-left CORNER of
// the top-left pixel, so the centre of pixel (i, j) is (i + 0.5, j + 0.5)
// (docs/design/auto-extraction-review-design.md, "画素座標の約束"). The
// backend uses array indices — pixel centres at integers; its upscale
// mapping `元 = (拡大後 + 0.5) / s − 0.5` is written in that convention. So
// half a pixel is added to everything that comes back and taken off what is
// sent. Half a pixel is below the edit log's move tolerance, but a
// calibration that is consistently off by it would bias every value.
export const BACKEND_PIXEL_OFFSET = 0.5

export const toDigitizerPx = (px: number) => px + BACKEND_PIXEL_OFFSET
export const toBackendPx = (px: number) => px - BACKEND_PIXEL_OFFSET

export type AutoAxisName = 'x' | 'y'

export interface AutoAxisTick {
  value: number
  /** position along the axis (x for the x axis, y for the y axis) */
  px: number
}

export interface AutoAxisProposal {
  ok: boolean
  scale: AxisScale | null
  ticks: AutoAxisTick[]
  /** 0..1, an heuristic (NOT a calibrated probability), null if absent */
  confidence: number | null
  residualPx: number | null
  /** e.g. `no_labels_read`, `too_few_labels`, `no_consistent_fit` */
  failureReason: string | null
}

export interface AutoCalibrationProposal {
  /** ok = both axes, partial = one, failed = none */
  status: 'ok' | 'partial' | 'failed'
  failureReason: string | null
  /** the plot frame; its left/bottom edges are the y/x axis lines */
  frame: Rect | null
  /** which side the y axis is on (a right-hand y axis sits on the frame's right edge) */
  ySide: 'left' | 'right'
  x: AutoAxisProposal
  y: AutoAxisProposal
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

function invalid(message: string): DigitizerError {
  return new DigitizerError(
    'AUTO_SERVICE_FAILED',
    `The auto service answered in an unexpected shape: ${message}`,
  )
}

const FAILED_AXIS: AutoAxisProposal = {
  ok: false,
  scale: null,
  ticks: [],
  confidence: null,
  residualPx: null,
  failureReason: 'not_returned',
}

// INFO: `px` is the 1-D position; `x` / `y` are the point on the image.
// Prefer px, fall back to the matching coordinate.
function parseTick(tick: unknown, name: AutoAxisName): AutoAxisTick[] {
  if (!isRecord(tick) || !finite(tick.value)) return []
  let px: number | undefined
  if (finite(tick.px)) {
    px = tick.px
  } else if (finite(tick[name])) {
    px = tick[name] as number
  }
  if (px === undefined) return []
  return [{ value: tick.value, px: toDigitizerPx(px) }]
}

function parseAxis(raw: unknown, name: AutoAxisName): AutoAxisProposal {
  if (!isRecord(raw)) return { ...FAILED_AXIS }
  const scale = raw.scale === 'linear' || raw.scale === 'log' ? raw.scale : null
  const ticks: AutoAxisTick[] = Array.isArray(raw.ticks)
    ? raw.ticks.flatMap((tick: unknown) => parseTick(tick, name))
    : []
  // INFO: "ok" is the backend's word, but an ok axis is only usable here
  // with a scale and two distinct ticks; anything less is reported as failed
  // rather than half-applied.
  const distinctValues = new Set(ticks.map((t) => t.value)).size
  const ok =
    raw.status === 'ok' &&
    scale !== null &&
    distinctValues >= 2 &&
    (scale === 'linear' || ticks.every((t) => t.value > 0))
  return {
    ok,
    scale,
    ticks,
    confidence: finite(raw.confidence) ? raw.confidence : null,
    residualPx: finite(raw.residual_px) ? raw.residual_px : null,
    failureReason: axisFailureReason(raw.failure_reason, ok),
  }
}

function axisFailureReason(reason: unknown, ok: boolean): string | null {
  if (typeof reason === 'string') return reason
  return ok ? null : 'unusable_answer'
}

/** `POST /calibrate` body → the proposal shown to the user. */
export function parseCalibrationResponse(
  body: unknown,
): AutoCalibrationProposal {
  if (!isRecord(body)) throw invalid('calibration is not an object')
  const frames = Array.isArray(body.frames) ? body.frames : []
  // INFO: frames are ordered best first; frames[0] is the one to propose
  const frame = isRecord(frames[0]) ? frames[0] : null
  const axes = frame && isRecord(frame.axes) ? frame.axes : {}
  const x = parseAxis(axes.x, 'x')
  const y = parseAxis(axes.y, 'y')

  let rect: Rect | null = null
  const box = frame && isRecord(frame.box) ? frame.box : null
  if (
    box &&
    finite(box.x0) &&
    finite(box.y0) &&
    finite(box.x1) &&
    finite(box.y1)
  ) {
    const x0 = toDigitizerPx(Math.min(box.x0, box.x1))
    const y0 = toDigitizerPx(Math.min(box.y0, box.y1))
    rect = {
      xPx: x0,
      yPx: y0,
      widthPx: Math.abs(box.x1 - box.x0),
      heightPx: Math.abs(box.y1 - box.y0),
    }
  }

  const usable = Number(x.ok) + Number(y.ok)
  return {
    status: (['failed', 'partial', 'ok'] as const)[usable],
    failureReason: calibrationFailureReason(body.failure_reason, usable),
    frame: rect,
    ySide: frame && frame.y_side === 'right' ? 'right' : 'left',
    x,
    y,
  }
}

function calibrationFailureReason(
  reason: unknown,
  usableAxes: number,
): string | null {
  if (typeof reason === 'string') return reason
  return usableAxes === 0 ? 'axes_not_calibrated' : null
}

export interface ServerExtractionSeries {
  /** what the method calls the series (`circle`, `line 1`, …), if anything */
  label: string | null
  /** the legend text matched to the series, if the backend read one */
  legendLabel: string | null
  /** series confidence, 0..1, or null */
  score: number | null
  /** digitizer pixels, with each point's own score when the method has one */
  points: ServerExtractionPoint[]
}

export interface ServerExtractionPoint {
  xPx: number
  yPx: number
  score?: number
}

export interface ServerExtractionResult {
  method: string | null
  elapsedMs: number | null
  series: ServerExtractionSeries[]
}

/** `POST /extract` body → series ready to become draft datasets. */
export function parseExtractionResponse(body: unknown): ServerExtractionResult {
  if (!isRecord(body) || !Array.isArray(body.series)) {
    throw invalid('extraction has no `series` array')
  }
  const series = body.series.flatMap(parseSeries)
  return {
    method: typeof body.method === 'string' ? body.method : null,
    elapsedMs: finite(body.elapsed_ms) ? body.elapsed_ms : null,
    series,
  }
}

// INFO: point_scores must line up with points one-to-one, or not be used at
// all (the backend sends null in that case too)
function parseSeries(raw: unknown): ServerExtractionSeries[] {
  if (!isRecord(raw) || !Array.isArray(raw.points)) return []
  const scores =
    Array.isArray(raw.point_scores) &&
    raw.point_scores.length === raw.points.length
      ? raw.point_scores
      : null
  const points = raw.points.flatMap((p: unknown, index: number) => {
    if (!Array.isArray(p) || !finite(p[0]) || !finite(p[1])) return []
    const point: ServerExtractionPoint = {
      xPx: toDigitizerPx(p[0]),
      yPx: toDigitizerPx(p[1]),
    }
    const score = scores?.[index]
    if (finite(score)) point.score = score
    return [point]
  })
  if (points.length === 0) return []
  const legend =
    typeof raw.legend_label === 'string' ? raw.legend_label.trim() : ''
  return [
    {
      label: typeof raw.label === 'string' ? raw.label : null,
      legendLabel: legend || null,
      score: finite(raw.score) ? raw.score : null,
      points,
    },
  ]
}
