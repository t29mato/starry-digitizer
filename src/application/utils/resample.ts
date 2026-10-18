// INFO: Resample — thin, simplify, smooth or re-sample a dataset's points.
// Pure functions on points in an axis set's calibrated space (see
// calibratedSpace.ts): `u` is x (log10 x on a log axis), `v` is y likewise.
// Nothing here knows about datasets, pixels or the undo stack; the use case
// that applies the result is resampleOperations.ts.
//
// The algorithms are the textbook ones (arc-length thinning, Douglas–Peucker,
// a centred moving average, piecewise-linear interpolation), written here
// from their definitions.

export type CalPoint = { u: number; v: number }

/**
 * - `thin`: keep N existing points, evenly spaced along the curve (arc length)
 * - `every`: keep every k-th point (and the last)
 * - `simplify`: Douglas–Peucker with a tolerance in screen pixels
 * - `atX`: new points at given x values, linearly interpolated
 * - `smooth`: moving average only (the point count stays)
 */
export type ResampleMode = 'thin' | 'every' | 'simplify' | 'atX' | 'smooth'

export interface ResampleOptions {
  mode: ResampleMode
  /** thin: points to keep; atX with xSpec 'count': how many x values */
  count?: number
  /** every: keep every k-th point */
  k?: number
  /** simplify: tolerance in screen pixels */
  tolerancePx?: number
  /** atX: N evenly spaced x values between from/to, or a typed list */
  xSpec?: 'count' | 'list'
  /** atX 'count': range in DATA units; default = the data's own range */
  xFrom?: number
  xTo?: number
  /** atX 'list': x values in data units, separated by commas/spaces */
  xList?: string
  /** moving-average window in points (odd; 1 or absent = no smoothing) */
  smoothWindow?: number
  /** geometry modes: sort by x before thinning (atX always sorts) */
  sortByX?: boolean
}

export interface ResampleResultPoint extends CalPoint {
  /**
   * Index of the input point this one IS (possibly moved by smoothing).
   * Absent for points created by interpolation.
   */
  source?: number
}

export interface ResamplePlan {
  points: ResampleResultPoint[]
  notes: string[]
  error?: string
}

/** Upper bound on generated points, so a typo cannot build a million. */
export const MAX_RESAMPLE_POINTS = 10000
/** Upper bound on the smoothing window. */
export const MAX_SMOOTH_WINDOW = 101

export interface Metric {
  pxPerU: number
  pxPerV: number
}

function distance(a: CalPoint, b: CalPoint, m: Metric): number {
  return Math.hypot((a.u - b.u) * m.pxPerU, (a.v - b.v) * m.pxPerV)
}

/**
 * Indices of N points spread evenly by arc length. Ends are always kept, the
 * indices are strictly increasing (so N distinct points come back) and
 * N >= length keeps everything.
 */
export function thinEvenly(
  points: CalPoint[],
  n: number,
  metric: Metric,
): number[] {
  const len = points.length
  if (n >= len) return points.map((_, i) => i)
  if (n <= 1) return len === 0 ? [] : [0]
  const cumulative = [0]
  for (let i = 1; i < len; i++) {
    cumulative.push(
      cumulative[i - 1] + distance(points[i - 1], points[i], metric),
    )
  }
  const total = cumulative[len - 1]
  const result: number[] = []
  let previous = -1
  for (let j = 0; j < n; j++) {
    // INFO: a curve of zero length (all points on one pixel) falls back to
    // evenly spaced indices.
    let index: number
    if (total === 0) {
      index = Math.round((j * (len - 1)) / (n - 1))
    } else {
      const target = (j * total) / (n - 1)
      index = nearestIndex(cumulative, target)
    }
    // INFO: keep room for the points still to come and stay strictly
    // increasing; this is what makes the count exact.
    const lowest = previous + 1
    const highest = len - (n - j)
    index = Math.min(Math.max(index, lowest), highest)
    result.push(index)
    previous = index
  }
  return result
}

function nearestIndex(sorted: number[], target: number): number {
  let lo = 0
  let hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < target) lo = mid + 1
    else hi = mid
  }
  if (lo > 0 && target - sorted[lo - 1] <= sorted[lo] - target) return lo - 1
  return lo
}

/** Indices 0, k, 2k, … and always the last one. */
export function everyKth(length: number, k: number): number[] {
  if (length === 0) return []
  const step = Math.max(1, Math.floor(k))
  const result: number[] = []
  for (let i = 0; i < length; i += step) result.push(i)
  if (result[result.length - 1] !== length - 1) result.push(length - 1)
  return result
}

function segmentDistance(
  p: CalPoint,
  a: CalPoint,
  b: CalPoint,
  m: Metric,
): number {
  const px = p.u * m.pxPerU
  const py = p.v * m.pxPerV
  const ax = a.u * m.pxPerU
  const ay = a.v * m.pxPerV
  const bx = b.u * m.pxPerU
  const by = b.v * m.pxPerV
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.min(
    1,
    Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSq),
  )
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Douglas–Peucker: the indices of the points needed so that no dropped point
 * is farther than `tolerancePx` from the simplified polyline. Iterative (an
 * explicit stack), so long point runs cannot overflow the call stack.
 */
export function douglasPeucker(
  points: CalPoint[],
  tolerancePx: number,
  metric: Metric,
): number[] {
  const len = points.length
  if (len <= 2) return points.map((_, i) => i)
  const keep = new Uint8Array(len)
  keep[0] = 1
  keep[len - 1] = 1
  const stack: [number, number][] = [[0, len - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number]
    let farthest = -1
    let farthestDistance = -1
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last], metric)
      if (d > farthestDistance) {
        farthestDistance = d
        farthest = i
      }
    }
    if (farthest !== -1 && farthestDistance > tolerancePx) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }
  const result: number[] = []
  keep.forEach((flag, i) => {
    if (flag) result.push(i)
  })
  return result
}

/**
 * Centred moving average over `window` points. Near the ends the window
 * shrinks symmetrically, so the first and last values never move.
 */
export function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(Math.max(1, window) / 2)
  if (half === 0) return values.slice()
  // INFO: prefix sums keep this O(n) whatever the window.
  const prefix = [0]
  values.forEach((value, i) => prefix.push(prefix[i] + value))
  return values.map((_, i) => {
    const h = Math.min(half, i, values.length - 1 - i)
    return (prefix[i + h + 1] - prefix[i - h]) / (2 * h + 1)
  })
}

/**
 * Sort by u, drop non-finite points and average points with the same u, so
 * the series is a function of x that interpolation can use.
 */
export function prepareSeries(points: CalPoint[]): CalPoint[] {
  const finite = points
    .filter((p) => Number.isFinite(p.u) && Number.isFinite(p.v))
    .sort((a, b) => a.u - b.u)
  const result: CalPoint[] = []
  let i = 0
  while (i < finite.length) {
    let j = i
    let sum = 0
    while (j < finite.length && finite[j].u === finite[i].u) {
      sum += finite[j].v
      j++
    }
    result.push({ u: finite[i].u, v: sum / (j - i) })
    i = j
  }
  return result
}

/**
 * Piecewise-linear interpolation of a prepared (sorted, unique-u) series.
 * Returns NaN outside [first u, last u] — no extrapolation.
 */
export function interpolateLinear(series: CalPoint[], u: number): number {
  const n = series.length
  if (n === 0 || u < series[0].u || u > series[n - 1].u) return NaN
  if (n === 1) return series[0].v
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (series[mid].u <= u) lo = mid
    else hi = mid
  }
  const a = series[lo]
  const b = series[hi]
  if (u === a.u) return a.v
  if (u === b.u) return b.v
  return a.v + ((u - a.u) / (b.u - a.u)) * (b.v - a.v)
}

/** N values from `from` to `to` inclusive, evenly spaced. */
export function evenlySpaced(from: number, to: number, n: number): number[] {
  if (n <= 1) return [from]
  return Array.from({ length: n }, (_, i) =>
    i === n - 1 ? to : from + ((to - from) * i) / (n - 1),
  )
}

/**
 * Parse a typed list of numbers ("1, 2.5 1e3; 4"). Returns the bad token
 * instead of guessing.
 */
export function parseValueList(
  text: string,
): { values: number[] } | { error: string } {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token !== '')
  const values: number[] = []
  for (const token of tokens) {
    const value = Number(token)
    if (!Number.isFinite(value)) return { error: `Not a number: "${token}"` }
    values.push(value)
  }
  return { values }
}

export interface ValueAxis {
  /** data value → calibrated u (NaN when not representable, e.g. ≤ 0 on log) */
  valueToU(x: number): number
  uToValue(u: number): number
  logX: boolean
}

function isPositiveInteger(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 1
}

/**
 * Work out the new points for `options`. `points` are in the order the
 * dataset holds them.
 */
export function planResample(
  input: CalPoint[],
  options: ResampleOptions,
  metric: Metric,
  axis: ValueAxis,
): ResamplePlan {
  const notes: string[] = []
  const fail = (error: string): ResamplePlan => ({ points: [], notes, error })

  const window = options.smoothWindow ?? 1
  if (!Number.isInteger(window) || window < 1 || window > MAX_SMOOTH_WINDOW) {
    return fail(
      `Smoothing window must be a whole number 1–${MAX_SMOOTH_WINDOW}`,
    )
  }
  if (window > 1 && window % 2 === 0) {
    return fail('Smoothing window must be odd (3, 5, 7, …)')
  }

  const indexed = input
    .map((p, i) => ({ ...p, source: i }))
    .filter((p) => Number.isFinite(p.u) && Number.isFinite(p.v))
  if (indexed.length < input.length) {
    notes.push(
      `${input.length - indexed.length} point(s) without a value were dropped`,
    )
  }
  if (indexed.length < 2) return fail('Needs at least 2 points')

  if (options.mode === 'atX') {
    return planAtX(indexed, options, window, axis, notes)
  }

  const ordered = options.sortByX
    ? indexed.slice().sort((a, b) => a.u - b.u || a.source - b.source)
    : indexed
  let working: ResampleResultPoint[] = ordered
  if (window > 1) {
    const us = movingAverage(
      ordered.map((p) => p.u),
      window,
    )
    const vs = movingAverage(
      ordered.map((p) => p.v),
      window,
    )
    working = ordered.map((p, i) => ({ u: us[i], v: vs[i], source: p.source }))
  }

  const keep = keptIndices(working, options, window, metric, notes)
  if (typeof keep === 'string') return fail(keep)
  return { points: keep.map((i) => working[i]), notes }
}

// INFO: the indices a geometry mode keeps, or the reason it refuses.
function keptIndices(
  working: CalPoint[],
  options: ResampleOptions,
  window: number,
  metric: Metric,
  notes: string[],
): number[] | string {
  switch (options.mode) {
    case 'smooth':
      if (window <= 1) return 'Set a smoothing window of 3 or more'
      return working.map((_, i) => i)
    case 'thin':
      if (!isPositiveInteger(options.count) || options.count < 2) {
        return 'Number of points must be a whole number ≥ 2'
      }
      if (options.count >= working.length) {
        notes.push('Already at or below that many points; all are kept')
      }
      return thinEvenly(working, options.count, metric)
    case 'every':
      if (!isPositiveInteger(options.k)) return 'k must be a whole number ≥ 1'
      return everyKth(working.length, options.k)
    case 'simplify':
      if (
        options.tolerancePx === undefined ||
        !Number.isFinite(options.tolerancePx) ||
        options.tolerancePx < 0
      ) {
        return 'Tolerance must be a number ≥ 0 (px)'
      }
      return douglasPeucker(working, options.tolerancePx, metric)
    default:
      return 'Unknown mode'
  }
}

function planAtX(
  indexed: CalPoint[],
  options: ResampleOptions,
  window: number,
  axis: ValueAxis,
  notes: string[],
): ResamplePlan {
  const fail = (error: string): ResamplePlan => ({ points: [], notes, error })
  let series = prepareSeries(indexed)
  if (series.length < indexed.length) {
    notes.push('Points with the same x were averaged')
  }
  if (series.length < 2) return fail('Needs at least 2 different x values')
  if (window > 1) {
    const vs = movingAverage(
      series.map((p) => p.v),
      window,
    )
    series = series.map((p, i) => ({ u: p.u, v: vs[i] }))
  }
  const uMin = series[0].u
  const uMax = series[series.length - 1].u

  const targets = atXTargets(options, uMin, uMax, axis, notes)
  if (typeof targets === 'string') return fail(targets)

  const points: ResampleResultPoint[] = []
  let outside = 0
  targets.forEach((u) => {
    const clamped = clampToRange(u, uMin, uMax)
    const v = interpolateLinear(series, clamped)
    if (Number.isNaN(v)) {
      outside++
      return
    }
    points.push({ u: clamped, v })
  })
  if (outside > 0) {
    notes.push(`${outside} x value(s) outside the data range were skipped`)
  }
  if (points.length === 0) return fail('No x value falls within the data range')
  points.sort((a, b) => a.u - b.u)
  return { points, notes }
}

// INFO: the x values (as u) Resample-at-x asks for, or the reason it refuses.
function atXTargets(
  options: ResampleOptions,
  uMin: number,
  uMax: number,
  axis: ValueAxis,
  notes: string[],
): number[] | string {
  if ((options.xSpec ?? 'count') === 'count') {
    const n = options.count
    if (!isPositiveInteger(n)) return 'Number of x values must be ≥ 1'
    if (n > MAX_RESAMPLE_POINTS)
      return `At most ${MAX_RESAMPLE_POINTS} x values`
    const from =
      options.xFrom === undefined ? uMin : axis.valueToU(options.xFrom)
    const to = options.xTo === undefined ? uMax : axis.valueToU(options.xTo)
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return axis.logX
        ? 'From/To must be numbers > 0 on a log X axis'
        : 'From/To must be numbers'
    }
    if (n > 1 && from === to) return 'From and To are the same'
    if (axis.logX) notes.push('x values are evenly spaced in log (log X axis)')
    return evenlySpaced(from, to, n)
  }
  const parsed = parseValueList(options.xList ?? '')
  if ('error' in parsed) return parsed.error
  if (parsed.values.length === 0) return 'Type at least one x value'
  if (parsed.values.length > MAX_RESAMPLE_POINTS) {
    return `At most ${MAX_RESAMPLE_POINTS} x values`
  }
  const targets = parsed.values.map((x) => axis.valueToU(x))
  if (targets.some((u) => !Number.isFinite(u))) {
    return 'x values must be > 0 on a log X axis'
  }
  return targets
}

function clampToRange(u: number, uMin: number, uMax: number): number {
  // INFO: a tiny tolerance so the data's own end values, after the value →
  // log10 → value round trip, are not reported as "outside".
  const eps = (uMax - uMin) * 1e-12
  if (u < uMin && u >= uMin - eps) return uMin
  if (u > uMax && u <= uMax + eps) return uMax
  return u
}
