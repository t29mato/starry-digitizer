// INFO: Trace Curve — click on a curve and follow it both ways in its colour.
//
// Pure: RGBA pixels in, image coordinates out; no canvas, no DOM, no
// datasets. The use case that reads the canvas and adds the points is
// curveTraceOperations.ts.
//
// Colour matching and the mask are starry-digitizer's own (ExtractParent:
// the same `matchColor()` distance and the same `isOnMask()` test that Line
// Extract and Symbol Extract use), so "colour distance" means the same thing
// here as in Automatic Extraction.
//
// How the walk works (written for this project; a plain "look ahead on an
// arc" line follower):
//   1. seed: the matching pixel nearest the click (within seedRadiusPx);
//   2. line width: the shortest run of matching pixels through the seed in
//      four directions; the look-ahead radius R grows with it;
//   3. each step samples a half circle of radius R ahead of the heading, takes
//      the runs of matching samples, and steps to the centre of the run
//      nearest the heading; a run much wider than the line (another curve of
//      the same colour crossing) is crossed straight on instead;
//   4. after each step the position is re-centred across the line;
//   5. nothing ahead: look farther in a narrow cone, up to maxGapPx (dashed
//      lines, a curve of another colour drawn over this one);
//   6. stop at a longer gap, at the image edge, at the mask boundary, back on
//      its own path (closed curves), at a sharp turn where something of the
//      same colour joins (an axis), or after a step limit.
import { Coord } from '@/@types/types'
import { ExtractParent } from '@/application/strategies/extractStrategies/extractParent'

export type RGB = [number, number, number]

export interface TraceImage {
  width: number
  height: number
  /** RGBA, row-major, width × height × 4 */
  pixels: Uint8ClampedArray
  /** RGBA of the mask canvas; only consulted when `hasMask` */
  mask?: Uint8ClampedArray | null
  hasMask?: boolean
}

export type TraceSampling = 'path' | 'x'

export interface TraceOptions {
  /** same unit as Extractor.colorDistancePct (ExtractParent.matchColor) */
  colorDistancePct: number
  /** longest gap (px) that is jumped */
  maxGapPx: number
  /** output: a point every N px along the path, or at every multiple of N px in x */
  spacingPx: number
  sampling: TraceSampling
  /** trace this colour instead of the one under the click */
  color?: RGB
  /** how far from the click the curve may be (px) */
  seedRadiusPx?: number
}

/**
 * - `end`: nothing of the colour ahead, not even after a gap of maxGapPx
 * - `edge` / `mask`: ran into the image edge / the mask boundary
 * - `loop`: back on its own path (a closed curve)
 * - `junction`: a sharp turn where the curve meets something of its colour
 * - `limit`: the step limit
 */
export type TraceStop = 'end' | 'edge' | 'mask' | 'loop' | 'junction' | 'limit'

export interface TraceResult {
  /** image coordinates (pixel centres are at +0.5), left to right */
  points: Coord[]
  /** the colour that was followed */
  color: RGB | null
  /** why each end stopped: [left end, right end] in output order */
  stops: [TraceStop, TraceStop]
  /** length of the traced path in px */
  lengthPx: number
  error?: string
}

export const TRACE_LIMITS = {
  maxGapPx: 100,
  minSpacingPx: 1,
  maxSpacingPx: 200,
  maxSteps: 20000,
} as const

class Matcher extends ExtractParent {
  private cache: Int8Array
  constructor(
    private image: TraceImage,
    private color: RGB,
    private pct: number,
  ) {
    super()
    this.cache = new Int8Array(image.width * image.height)
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.image.width && y < this.image.height
  }

  onMask(x: number, y: number): boolean {
    const { mask, hasMask, width } = this.image
    if (!hasMask || !mask) return true
    const i = (y * width + x) * 4
    return this.isOnMask(mask[i], mask[i + 1], mask[i + 2], mask[i + 3])
  }

  /** 1 = curve colour, 0 = not, -1 = outside the image, -2 = outside the mask */
  at(fx: number, fy: number): number {
    const x = Math.floor(fx)
    const y = Math.floor(fy)
    if (!this.inside(x, y)) return -1
    const index = y * this.image.width + x
    const cached = this.cache[index]
    if (cached !== 0) return cached === 1 ? 1 : cached === 2 ? 0 : -2
    let result: number
    if (!this.onMask(x, y)) {
      result = -2
    } else {
      const p = index * 4
      const { pixels } = this.image
      result = this.matchColor(
        [pixels[p], pixels[p + 1], pixels[p + 2]],
        this.color,
        this.pct,
      )
        ? 1
        : 0
    }
    this.cache[index] = result === 1 ? 1 : result === 0 ? 2 : 3
    return result
  }

  is(fx: number, fy: number): boolean {
    return this.at(fx, fy) === 1
  }
}

function colorAt(image: TraceImage, x: number, y: number): RGB {
  const p = (y * image.width + x) * 4
  return [image.pixels[p], image.pixels[p + 1], image.pixels[p + 2]]
}

function colorDistanceSq(a: RGB, b: RGB): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

/**
 * The image's most common colour (16 levels per channel, on a sparse grid) —
 * the background, for picking the curve colour out of an anti-aliased click.
 */
export function dominantColor(image: TraceImage): RGB {
  const counts = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >()
  const step = Math.max(
    1,
    Math.floor(Math.sqrt((image.width * image.height) / 40000)),
  )
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const [r, g, b] = colorAt(image, x, y)
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const entry = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      entry.n++
      entry.r += r
      entry.g += g
      entry.b += b
      counts.set(key, entry)
    }
  }
  let best = { n: 0, r: 255, g: 255, b: 255 }
  counts.forEach((entry) => {
    if (entry.n > best.n) best = entry
  })
  if (best.n === 0) return [255, 255, 255]
  return [
    Math.round(best.r / best.n),
    Math.round(best.g / best.n),
    Math.round(best.b / best.n),
  ]
}

/**
 * The colour under the click. Of the pixels within `radius` that do not
 * match the background (same colour distance as the extraction), the one
 * nearest the click; then, around it, the one that differs most from the
 * background — an anti-aliased edge pixel is a blend of the two, so the most
 * different one is the line's own colour. Null when there is only background.
 */
export function pickColor(
  image: TraceImage,
  click: Coord,
  colorDistancePct = 1,
  radius = 6,
): RGB | null {
  const background = dominantColor(image)
  const matcher = new (class extends ExtractParent {})()
  const cx = Math.floor(click.xPx)
  const cy = Math.floor(click.yPx)
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < image.width && y < image.height
  let nearest: { x: number; y: number } | null = null
  let nearestDistance = Infinity
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d = dx * dx + dy * dy
      if (d > radius * radius || d >= nearestDistance) continue
      const x = cx + dx
      const y = cy + dy
      if (!inside(x, y)) continue
      if (
        matcher.matchColor(colorAt(image, x, y), background, colorDistancePct)
      ) {
        continue
      }
      nearest = { x, y }
      nearestDistance = d
    }
  }
  if (!nearest) return null
  let best = colorAt(image, nearest.x, nearest.y)
  let bestDistance = colorDistanceSq(best, background)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = nearest.x + dx
      const y = nearest.y + dy
      if (!inside(x, y)) continue
      const color = colorAt(image, x, y)
      const distance = colorDistanceSq(color, background)
      if (distance > bestDistance) {
        best = color
        bestDistance = distance
      }
    }
  }
  return best
}

function findSeed(m: Matcher, click: Coord, radius: number): Coord | null {
  const cx = Math.floor(click.xPx)
  const cy = Math.floor(click.yPx)
  let best: Coord | null = null
  let bestDistance = Infinity
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d = dx * dx + dy * dy
      if (d > radius * radius || d >= bestDistance) continue
      if (m.is(cx + dx + 0.5, cy + dy + 0.5)) {
        bestDistance = d
        best = { xPx: cx + dx + 0.5, yPx: cy + dy + 0.5 }
      }
    }
  }
  return best
}

function runLength(m: Matcher, p: Coord, dx: number, dy: number): number {
  let n = 1
  for (const sign of [1, -1]) {
    for (let t = 1; t < 200; t++) {
      if (!m.is(p.xPx + sign * dx * t, p.yPx + sign * dy * t)) break
      n++
    }
  }
  return n
}

function estimateWidth(m: Matcher, p: Coord): number {
  const s = Math.SQRT1_2
  const runs = [
    runLength(m, p, 1, 0),
    runLength(m, p, 0, 1),
    runLength(m, p, s, s) * s,
    runLength(m, p, s, -s) * s,
  ]
  return Math.min(40, Math.max(1, Math.min(...runs)))
}

/** Move p across the line (perpendicular to heading) onto the line's centre. */
function recentre(m: Matcher, p: Coord, heading: number, width: number): Coord {
  const nx = -Math.sin(heading)
  const ny = Math.cos(heading)
  const reach = Math.ceil(width) + 2
  let lo = 0
  let hi = 0
  if (!m.is(p.xPx, p.yPx)) return p
  while (
    lo > -reach &&
    m.is(p.xPx + nx * (lo - 0.5), p.yPx + ny * (lo - 0.5))
  ) {
    lo -= 0.5
  }
  while (hi < reach && m.is(p.xPx + nx * (hi + 0.5), p.yPx + ny * (hi + 0.5))) {
    hi += 0.5
  }
  // INFO: a run that reaches `reach` on both sides is a blob or a crossing,
  // not a line seen across; leave the position alone there.
  if (lo <= -reach && hi >= reach) return p
  const shift = (lo + hi) / 2
  return { xPx: p.xPx + nx * shift, yPx: p.yPx + ny * shift }
}

interface Run {
  start: number
  end: number
}

interface ArcScan {
  runs: {
    angle: number
    widthPx: number
    startAngle: number
    endAngle: number
  }[]
  sawEdge: boolean
  sawMaskEdge: boolean
}

/** Sample an arc of radius r around p from angle a0 to a1 (radians). */
function scanArc(
  m: Matcher,
  p: Coord,
  r: number,
  a0: number,
  a1: number,
  fullCircle = false,
): ArcScan {
  const count = Math.max(8, Math.ceil(((a1 - a0) * r) / 0.75))
  const step = (a1 - a0) / count
  const flags: boolean[] = []
  let sawEdge = false
  let sawMaskEdge = false
  const samples = fullCircle ? count : count + 1
  for (let i = 0; i < samples; i++) {
    const a = a0 + i * step
    const v = m.at(p.xPx + r * Math.cos(a), p.yPx + r * Math.sin(a))
    if (v === -1) sawEdge = true
    if (v === -2) sawMaskEdge = true
    flags.push(v === 1)
  }
  const runs: Run[] = []
  let i = 0
  while (i < flags.length) {
    if (!flags[i]) {
      i++
      continue
    }
    let j = i
    while (j + 1 < flags.length && flags[j + 1]) j++
    runs.push({ start: i, end: j })
    i = j + 1
  }
  // INFO: on a full circle the first and last runs are one run across angle 0
  if (fullCircle && runs.length > 1) {
    const first = runs[0]
    const last = runs[runs.length - 1]
    if (first.start === 0 && last.end === flags.length - 1) {
      runs.pop()
      runs[0] = { start: last.start - flags.length, end: first.end }
    }
  } else if (
    fullCircle &&
    runs.length === 1 &&
    runs[0].end - runs[0].start + 1 === flags.length
  ) {
    // the whole circle matches: inside a blob, no direction to take
    return { runs: [], sawEdge, sawMaskEdge }
  }
  return {
    runs: runs.map((run) => {
      const startAngle = a0 + run.start * step
      const endAngle = a0 + run.end * step
      return {
        angle: (startAngle + endAngle) / 2,
        widthPx: (run.end - run.start + 1) * Math.abs(step) * r,
        startAngle,
        endAngle,
      }
    }),
    sawEdge,
    sawMaskEdge,
  }
}

function angleDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d < -Math.PI) d += 2 * Math.PI
  return d
}

// INFO: 50° within about 3 steps of R px (R is a few px): far more than a
// smooth curve turns, about what a curve running into an axis does.
const JUNCTION_TURN = (50 * Math.PI) / 180
// INFO: how many steps back the turn is measured from (3 steps ≈ 3R px)
const JUNCTION_LOOKBACK = 3

class PathIndex {
  private cells = new Map<string, { dir: number; index: number; p: Coord }[]>()
  constructor(private cell: number) {}
  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`
  }
  add(dir: number, index: number, p: Coord): void {
    const k = this.key(p.xPx, p.yPx)
    const list = this.cells.get(k) ?? []
    list.push({ dir, index, p })
    this.cells.set(k, list)
  }
  /** whether p is back on an earlier part of the path */
  revisits(dir: number, index: number, p: Coord, radius: number): boolean {
    const cx = Math.floor(p.xPx / this.cell)
    const cy = Math.floor(p.yPx / this.cell)
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = this.cells.get(`${gx},${gy}`)
        if (!list) continue
        for (const e of list) {
          // INFO: the last few points of this direction are always close;
          // the first points of the other direction are close to the seed.
          if (e.dir === dir && e.index >= index - 3) continue
          if (e.dir !== dir && e.index < 3 && index < 3) continue
          if (Math.hypot(e.p.xPx - p.xPx, e.p.yPx - p.yPx) < radius) return true
        }
      }
    }
    return false
  }
}

type ArcRun = ArcScan['runs'][number]

function nearestRun(runs: ArcRun[], heading: number): ArcRun {
  return runs.reduce((a, b) =>
    Math.abs(angleDiff(a.angle, heading)) <=
    Math.abs(angleDiff(b.angle, heading))
      ? a
      : b,
  )
}

function isJunction(
  path: Coord[],
  p: Coord,
  r: number,
  heading0: number,
  heading: number,
  target: number,
): boolean {
  const back =
    path.length >= JUNCTION_LOOKBACK
      ? path[path.length - JUNCTION_LOOKBACK]
      : null
  const reference =
    back && Math.hypot(p.xPx - back.xPx, p.yPx - back.yPx) > r
      ? Math.atan2(p.yPx - back.yPx, p.xPx - back.xPx)
      : heading0
  if (Math.abs(angleDiff(target, reference)) <= JUNCTION_TURN) return false
  // INFO: before there is a path to look back along, only a sharp turn from
  // the current heading counts.
  return (
    path.length >= JUNCTION_LOOKBACK ||
    Math.abs(angleDiff(target, heading)) > JUNCTION_TURN
  )
}

/**
 * The last matching position straight ahead of p (within `reach`), re-centred
 * — so the trace ends where the line ends, not up to one step short of it.
 */
function extendToEnd(
  m: Matcher,
  p: Coord,
  heading: number,
  reach: number,
  width: number,
): Coord | null {
  const dx = Math.cos(heading)
  const dy = Math.sin(heading)
  let last = 0
  for (let t = 0.5; t <= reach; t += 0.5) {
    if (!m.is(p.xPx + dx * t, p.yPx + dy * t)) break
    last = t
  }
  // INFO: stop half a line width short of the very last pixel: that is where
  // the centre of a line with a square end is.
  const along = last - width / 2
  if (along < 0.5) return null
  return recentre(
    m,
    { xPx: p.xPx + dx * along, yPx: p.yPx + dy * along },
    heading,
    width,
  )
}

function walk(
  m: Matcher,
  seed: Coord,
  heading0: number,
  width: number,
  options: TraceOptions,
  index: PathIndex,
  dir: number,
): { path: Coord[]; stop: TraceStop } {
  const r = Math.max(3, Math.ceil(width * 1.5) + 1)
  const path: Coord[] = []
  let p = seed
  let heading = heading0
  const crossingWidth = width * 2.5 + 2
  for (let stepIndex = 0; stepIndex < TRACE_LIMITS.maxSteps; stepIndex++) {
    const scan = scanArc(m, p, r, heading - Math.PI / 2, heading + Math.PI / 2)
    let target: number | null = null
    let distance = r
    if (scan.runs.length > 0) {
      const nearest = nearestRun(scan.runs, heading)
      // INFO: a sharp turn within one step is where the curve meets something
      // of its own colour (an axis, a frame, another series) — a smooth curve
      // sampled every R px turns far less. Which way the curve goes is a
      // guess there, so stop rather than wander off along the axis.
      // The turn is measured against the path a few steps back, because the
      // walker would otherwise round the corner in several smaller turns.
      if (isJunction(path, p, r, heading0, heading, nearest.angle)) {
        const end = extendToEnd(m, p, heading, r, width)
        if (end) path.push(end)
        return { path, stop: 'junction' }
      }
      target = nearest.angle
      // INFO: a much wider run is a same-coloured crossing: go straight on
      // when straight on is inside it.
      if (
        nearest.widthPx > crossingWidth &&
        angleDiff(heading, nearest.startAngle) >= 0 &&
        angleDiff(nearest.endAngle, heading) >= 0
      ) {
        target = heading
      }
    } else {
      // INFO: nothing at R: look farther, in a narrow cone (a gap)
      for (
        let gap = r + 1;
        gap <= r + options.maxGapPx && target === null;
        gap++
      ) {
        const cone = scanArc(m, p, gap, heading - 0.5, heading + 0.5)
        if (cone.runs.length > 0) {
          const nearest = nearestRun(cone.runs, heading)
          target = nearest.angle
          distance = gap
        }
      }
      if (target === null) {
        const end = extendToEnd(m, p, heading, r, width)
        if (end) path.push(end)
        const stop: TraceStop = scan.sawEdge
          ? 'edge'
          : scan.sawMaskEdge
          ? 'mask'
          : 'end'
        return { path, stop }
      }
    }
    let next = {
      xPx: p.xPx + distance * Math.cos(target),
      yPx: p.yPx + distance * Math.sin(target),
    }
    next = recentre(m, next, target, width)
    if (index.revisits(dir, path.length, next, r * 0.6)) {
      return { path, stop: 'loop' }
    }
    const stepHeading = Math.atan2(next.yPx - p.yPx, next.xPx - p.xPx)
    // INFO: a little inertia keeps the heading from following pixel noise
    heading = Math.atan2(
      Math.sin(heading) * 0.3 + Math.sin(stepHeading) * 0.7,
      Math.cos(heading) * 0.3 + Math.cos(stepHeading) * 0.7,
    )
    path.push(next)
    index.add(dir, path.length - 1, next)
    p = next
  }
  return { path, stop: 'limit' }
}

function pathLength(path: Coord[]): number {
  let length = 0
  for (let i = 1; i < path.length; i++) {
    length += Math.hypot(
      path[i].xPx - path[i - 1].xPx,
      path[i].yPx - path[i - 1].yPx,
    )
  }
  return length
}

/** Points every `spacing` px along the path; both ends kept. */
export function sampleAlongPath(path: Coord[], spacing: number): Coord[] {
  if (path.length <= 1) return path.slice()
  const out: Coord[] = [path[0]]
  let carried = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    const segment = Math.hypot(b.xPx - a.xPx, b.yPx - a.yPx)
    let t = spacing - carried
    while (t <= segment) {
      const f = t / segment
      out.push({
        xPx: a.xPx + (b.xPx - a.xPx) * f,
        yPx: a.yPx + (b.yPx - a.yPx) * f,
      })
      t += spacing
    }
    carried = segment - (t - spacing)
  }
  const last = path[path.length - 1]
  const tail = out[out.length - 1]
  if (Math.hypot(last.xPx - tail.xPx, last.yPx - tail.yPx) > spacing * 0.2) {
    out.push(last)
  } else {
    out[out.length - 1] = last
  }
  return out
}

/**
 * A point where the path crosses each multiple of `spacing` in x (also where
 * it goes back in x); both ends kept.
 */
export function sampleAlongX(path: Coord[], spacing: number): Coord[] {
  if (path.length <= 1) return path.slice()
  const out: Coord[] = [path[0]]
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]
    const b = path[i]
    if (a.xPx === b.xPx) continue
    const lo = Math.min(a.xPx, b.xPx)
    const hi = Math.max(a.xPx, b.xPx)
    const multiples: number[] = []
    for (let k = Math.floor(lo / spacing) + 1; k * spacing <= hi; k++) {
      if (k * spacing > lo) multiples.push(k * spacing)
    }
    if (b.xPx < a.xPx) multiples.reverse()
    multiples.forEach((x) => {
      const f = (x - a.xPx) / (b.xPx - a.xPx)
      out.push({ xPx: x, yPx: a.yPx + (b.yPx - a.yPx) * f })
    })
  }
  const last = path[path.length - 1]
  const tail = out[out.length - 1]
  if (Math.hypot(last.xPx - tail.xPx, last.yPx - tail.yPx) > spacing * 0.2) {
    out.push(last)
  } else {
    out[out.length - 1] = last
  }
  return out
}

export function traceCurve(
  image: TraceImage,
  click: Coord,
  options: TraceOptions,
): TraceResult {
  const empty = (error: string, color: RGB | null = null): TraceResult => ({
    points: [],
    color,
    stops: ['end', 'end'],
    lengthPx: 0,
    error,
  })
  if (image.width <= 0 || image.height <= 0) return empty('No image')
  const seedRadius = options.seedRadiusPx ?? 6
  const color =
    options.color ??
    pickColor(image, click, options.colorDistancePct, seedRadius)
  if (!color) return empty('No curve near the click (only background there)')
  const m = new Matcher(image, color, options.colorDistancePct)
  const walkOptions: TraceOptions = {
    ...options,
    maxGapPx: Math.min(TRACE_LIMITS.maxGapPx, Math.max(0, options.maxGapPx)),
  }
  const seed = findSeed(m, click, seedRadius)
  if (!seed) return empty('No pixel of the curve colour near the click', color)

  const width = estimateWidth(m, seed)
  const r = Math.max(3, Math.ceil(width * 1.5) + 1)
  const start = recentre(m, seed, 0, width)
  const around = scanArc(m, start, r, 0, 2 * Math.PI, true)
  if (around.runs.length === 0) {
    return empty(
      'No curve continues from the click (a dot or a filled area?)',
      color,
    )
  }
  // INFO: the two directions: the widest run, and the run most opposite it
  const first = around.runs.reduce((a, b) => (b.widthPx > a.widthPx ? b : a))
  const others = around.runs.filter((run) => run !== first)
  const opposite = others.length
    ? others.reduce((a, b) =>
        Math.abs(angleDiff(b.angle, first.angle)) >
        Math.abs(angleDiff(a.angle, first.angle))
          ? b
          : a,
      )
    : null
  const index = new PathIndex(r)
  index.add(0, 0, start)
  const forward = walk(m, start, first.angle, width, walkOptions, index, 1)
  const backward =
    opposite && Math.abs(angleDiff(opposite.angle, first.angle)) > Math.PI / 2
      ? walk(m, start, opposite.angle, width, walkOptions, index, 2)
      : { path: [] as Coord[], stop: 'end' as TraceStop }

  let path = [...backward.path.slice().reverse(), start, ...forward.path]
  let stops: [TraceStop, TraceStop] = [backward.stop, forward.stop]
  if (path[0].xPx > path[path.length - 1].xPx) {
    path = path.reverse()
    stops = [stops[1], stops[0]]
  }
  const spacing = Math.min(
    TRACE_LIMITS.maxSpacingPx,
    Math.max(TRACE_LIMITS.minSpacingPx, options.spacingPx),
  )
  const points =
    options.sampling === 'x'
      ? sampleAlongX(path, spacing)
      : sampleAlongPath(path, spacing)
  return { points, color, stops, lengthPx: pathLength(path) }
}
