// INFO: docs/design/auto-axis-detection-design.md — picks the tick label of
// each placed axis marker from the OCR words, and leaves the field empty
// rather than guess. Pure; the words come from AxisOcrReader (tesseract.js).
//
// The old rule ("the nearest numeric word within 150 px") filled a wrong
// value on 79 of 182 axes of the benchmark (real-chart-bench, 91 figures).
// The two main causes and the rules against them:
//   - near the origin the other axis's label is often nearer (x1 at the
//     origin took the y axis's "0"): a label must be on the label side of
//     its axis line (below the x axis, left of the y axis; above / right for
//     an axis drawn at the top / right) and lined up with the marker;
//   - lost decimal points and minus signs ("1.4" read as "14"): the labels
//     of one axis are a start value plus whole steps (in log10 on a log
//     axis), so all numeric labels beside the axis are fitted to one line
//     (value against pixel position), allowing the repairs tesseract most
//     often needs (a decimal point or a minus sign put back). A marker gets
//     the value of its label when the label is on the line, or the value
//     of the line when the marker sits on one of its ticks; otherwise
//     nothing.
import { AxisName, Coord, OcrWord } from './axisOcrMatcher'

export interface LabelMatchOptions {
  /** A label may sit at most this many label heights from its axis line. */
  maxGapInLabelHeights?: number
  /** Fewest labels on one line before the line is trusted. */
  minLabelsOnLine?: number
}

const DEFAULT_MAX_GAP_IN_LABEL_HEIGHTS = 6
// INFO: two labels always make a line, so they prove nothing; three that
// agree rarely do by chance.
const DEFAULT_MIN_LABELS_ON_LINE = 3

// INFO: the costs of a reading (a label on the line scores 1 minus its
// cost). Putting back a lost decimal point or minus sign is cheap; dropping
// a minus sign that was read is dear (a minus that is not there is rarer
// than one that got lost).
const ADD_COST = 0.25
const DROP_COST = 1
// INFO: the labels of one axis are printed with the same number of decimals
// ("0.0 1.0 2.0"); on a line that also holds "0.0", a "40" is more likely a
// "4.0" with its point lost than a 40.
const DECIMALS_COST = 0.5
// INFO: see contradictions()
const CONTRADICTION_COST = 1
// INFO: a line whose values fall the other way (x growing to the left, y
// growing downwards) loses a tie: "60 40 20 0 20 40 60" with the minus
// signs lost fits both ways.
const REVERSED_COST = 0.1

/** Where the labels of each axis are, from the placed markers. */
export interface LabelSides {
  /** the x axis line (mean y of x1/x2), when an x marker is placed */
  xAxisY?: number
  /** the y axis line (mean x of y1/y2), when a y marker is placed */
  yAxisX?: number
  xLabelsAbove: boolean
  yLabelsRight: boolean
}

const mean = (values: number[]) =>
  values.reduce((s, v) => s + v, 0) / values.length

// INFO: a y axis to the right of the middle of the x markers is a
// right-hand axis (labels on its right); an x axis above the middle of the
// y markers is a top axis (labels above it). Without the other axis's
// markers: the usual sides.
export const labelSides = (
  axisCoords: Partial<Record<AxisName, Coord | undefined>>,
): LabelSides => {
  const xs = (['x1', 'x2'] as const).flatMap((n) => axisCoords[n] ?? [])
  const ys = (['y1', 'y2'] as const).flatMap((n) => axisCoords[n] ?? [])
  const xAxisY = xs.length > 0 ? mean(xs.map((c) => c.yPx)) : undefined
  const yAxisX = ys.length > 0 ? mean(ys.map((c) => c.xPx)) : undefined
  return {
    xAxisY,
    yAxisX,
    xLabelsAbove:
      xAxisY !== undefined &&
      ys.length === 2 &&
      xAxisY < mean(ys.map((c) => c.yPx)),
    yLabelsRight:
      yAxisX !== undefined &&
      xs.length === 2 &&
      yAxisX > mean(xs.map((c) => c.xPx)),
  }
}

// INFO: tesseract returns the typographic minus (U+2212) and dashes for
// "-"; a few journals print a comma as the decimal mark ("0,1"). Returns the
// number as plain ASCII text ("-0.1"), or null when it is not a number.
const normalizeNumberText = (raw: string): string | null => {
  let text = raw.trim().replace(/[−‒–—]/g, '-')
  if (/^-?\d{1,3}(,\d{3})+$/.test(text) && !/^-?0,/.test(text)) {
    text = text.replace(/,/g, '')
  } else if (/^-?\d+,\d+$/.test(text)) {
    text = text.replace(',', '.')
  }
  return /^-?(\d+(\.\d+)?|\.\d+)([eE][-+]?\d+)?$/.test(text) ? text : null
}

export const parseAxisNumber = (raw: string): number | null => {
  const text = normalizeNumberText(raw)
  return text === null ? null : Number(text)
}

export interface Candidate {
  value: number
  cost: number
  /** digits after the decimal point in this reading */
  decimals: number
}

// INFO: the values an OCR reading may stand for: as read, with a decimal
// point put back at any place, with a minus sign put back, without the
// minus read. An integer printed with a leading zero ("08") does not occur
// on an axis, so "08" is only taken as 0.8.
export const repairCandidates = (raw: string): Candidate[] => {
  const text = normalizeNumberText(raw)
  if (text === null) return []
  const value = Number(text)
  const digits = text.replace(/^-/, '')
  const negative = text.startsWith('-')
  const sign = negative ? '-' : ''
  const decimals = /\.(\d+)$/.exec(text)?.[1].length ?? 0
  const out: Candidate[] = []
  if (!/^0\d/.test(digits)) out.push({ value, cost: 0, decimals })
  if (/^\d{2,}$/.test(digits)) {
    for (let i = 1; i < digits.length; i++) {
      const v = Number(`${sign}${digits.slice(0, i)}.${digits.slice(i)}`)
      const d = digits.length - i
      out.push({ value: v, cost: ADD_COST, decimals: d })
      if (!negative) out.push({ value: -v, cost: ADD_COST * 2, decimals: d })
    }
  }
  if (value !== 0) {
    const cost = negative ? DROP_COST : ADD_COST
    out.push({ value: -value, cost, decimals })
  }
  return out.filter((c, i) => out.findIndex((d) => d.value === c.value) === i)
}

interface PlacedCandidate extends Candidate {
  /** centre of the reading along the axis (x for x, y for y) */
  pos: number
}

interface Label {
  word: OcrWord
  candidates: PlacedCandidate[]
}

interface Line {
  log: boolean
  /** value (log10 of it on a log line) = a + b × pos */
  a: number
  b: number
  /** for each label: the index of its candidate on the line, or -1 */
  fit: number[]
  score: number
}

const height = (w: OcrWord) => w.bbox.y1 - w.bbox.y0
const centreX = (w: OcrWord) => (w.bbox.x0 + w.bbox.x1) / 2
const centreY = (w: OcrWord) => (w.bbox.y0 + w.bbox.y1) / 2
const median = (values: number[]) => {
  const s = [...values].sort((p, q) => p - q)
  return s[Math.floor(s.length / 2)]
}

// INFO: on a log axis only 1, 2, 3 and 5 times a power of ten count as
// labels, and a log line needs two powers of ten on it: without these rules
// any three misread numbers make a "log line" of their own.
const transform = (value: number, log: boolean): number | null => {
  if (!log) return value
  if (!(value > 0)) return null
  const t = Math.log10(value)
  const mantissa = value / 10 ** Math.floor(t + 1e-9)
  return [1, 2, 3, 5].some((m) => Math.abs(mantissa - m) < 1e-6) ? t : null
}

const isPowerOfTen = (value: number) => {
  const t = Math.log10(value)
  return value > 0 && Math.abs(t - Math.round(t)) < 1e-9
}

const onLine = (labels: Label[], fit: number[]): PlacedCandidate[] =>
  labels.flatMap((l, i) => (fit[i] >= 0 ? [l.candidates[fit[i]]] : []))

interface Grid {
  /** smallest value on the line */
  v0: number
  step: number
  /** steps from the smallest to the largest value on the line */
  span: number
}

// INFO: tick labels are a start value plus whole steps; the step is the
// smallest difference between two values on the line.
const gridOf = (labels: Label[], fit: number[]): Grid | null => {
  const values = onLine(labels, fit)
    .map((c) => c.value)
    .sort((p, q) => p - q)
  const diffs = values
    .slice(1)
    .map((v, i) => v - values[i])
    .filter((d) => d > 0)
  if (diffs.length === 0) return null
  const step = Math.min(...diffs)
  const v0 = values[0]
  return { v0, step, span: Math.round((values[values.length - 1] - v0) / step) }
}

/** Where `value` falls on the grid, in steps from v0. */
const stepsOf = (grid: Grid, value: number) => (value - grid.v0) / grid.step

// INFO: on a linear line, a label whose value is off the step grid by more
// than 3 % of a step (a stray "1" from a tick mark: "12" read as "121" and
// repaired to 12.1) is taken off the line.
const keepOnGrid = (labels: Label[], fit: number[]): number[] => {
  const grid = gridOf(labels, fit)
  if (!grid) return fit
  return fit.map((k, i) => {
    if (k < 0) return k
    const steps = stepsOf(grid, labels[i].candidates[k].value)
    return Math.abs(steps - Math.round(steps)) <= 0.03 ? k : -1
  })
}

// INFO: a label read cleanly (a reading that needs no repair) that sits on
// a tick of the line between its outermost labels but says another value
// speaks against the line: three misread labels can line up by chance
// ("300 400 ... 700" read as "100 100 ... 700" fits steps of 200 with a
// minus sign put back), a real tick labelled differently does not.
const contradictions = (labels: Label[], line: Line): number => {
  if (line.log) return 0
  const grid = gridOf(labels, line.fit)
  if (!grid) return 0
  return labels.filter((l, i) => {
    if (line.fit[i] >= 0) return false
    const clean = l.candidates.find((c) => c.cost === 0)
    if (!clean) return false
    const steps = stepsOf(grid, line.a + line.b * clean.pos)
    const k = Math.round(steps)
    return Math.abs(steps - k) <= 0.1 && k > 0 && k < grid.span
  }).length
}

// INFO: tries the line through every pair of labels (every pair of their
// readings) and keeps the best scoring one. A label is on the line when the
// line puts its value within a sixth of the median label spacing (at least
// 3 px) of its centre: tesseract's boxes are tight, so a centred label is
// off by 1-2 px, while a reading off by a factor of ten or by its sign
// misses by whole spacings. `direction` is +1 when values grow along +pos
// (x axis), -1 when they grow along -pos (y axis: image y points down).
const fitLine = (
  labels: Label[],
  log: boolean,
  direction: number,
): Line | null => {
  const sorted = labels.map((l) => l.candidates[0].pos).sort((p, q) => p - q)
  const gaps = sorted
    .slice(1)
    .map((p, i) => p - sorted[i])
    .filter((g) => g > 1)
  if (gaps.length === 0) return null
  const tolPx = Math.max(3, median(gaps) / 6)

  let best: Line | null = null
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      for (const ci of labels[i].candidates) {
        for (const cj of labels[j].candidates) {
          if (Math.abs(ci.pos - cj.pos) < 1) continue
          const ti = transform(ci.value, log)
          const tj = transform(cj.value, log)
          if (ti === null || tj === null || ti === tj) continue
          const b = (tj - ti) / (cj.pos - ci.pos)
          const a = ti - b * ci.pos
          let fit = labels.map((l) => {
            let k = -1
            l.candidates.forEach((c, n) => {
              const t = transform(c.value, log)
              if (t === null || Math.abs((t - a) / b - c.pos) > tolPx) return
              if (k < 0 || c.cost < l.candidates[k].cost) k = n
            })
            return k
          })
          if (log) {
            const decades = onLine(labels, fit).filter((c) =>
              isPowerOfTen(c.value),
            )
            if (decades.length < 2) continue
          } else {
            fit = keepOnGrid(labels, fit)
          }
          const line: Line = { log, a, b, fit, score: 0 }
          const readings = onLine(labels, fit)
          const decimals = Math.max(...readings.map((c) => c.decimals))
          line.score =
            readings.reduce(
              (s, c) =>
                s + 1 - c.cost - (c.decimals < decimals ? DECIMALS_COST : 0),
              0,
            ) -
            CONTRADICTION_COST * contradictions(labels, line) -
            (Math.sign(b) === direction ? 0 : REVERSED_COST)
          if (!best || line.score > best.score) best = line
        }
      }
    }
  }
  return best
}

const countOnLine = (line: Line) => line.fit.filter((k) => k >= 0).length

// INFO: the line the labels of one axis lie on: linear or log, whichever
// scores higher, with at least `minOnLine` labels on it; null when there is
// none, or when "10" is read at several ticks (a log axis printed as 10
// with a superscript exponent that OCR lost: nothing on it can be trusted).
const bestLine = (
  labels: Label[],
  axis: 'x' | 'y',
  minOnLine: number,
): Line | null => {
  if (labels.length < minOnLine) return null
  const tens = labels.filter((l) =>
    l.candidates.some((c) => c.cost === 0 && c.value === 10),
  )
  if (tens.length >= 2) return null
  const direction = axis === 'x' ? 1 : -1
  const fits = [
    fitLine(labels, false, direction),
    fitLine(labels, true, direction),
  ].filter((f): f is Line => f !== null && countOnLine(f) >= minOnLine)
  if (fits.length === 0) return null
  return fits.reduce((p, q) => (q.score > p.score ? q : p))
}

// INFO: the label lined up with a marker: its box spans the marker's
// position along the axis (half a label height of slack); the nearest such
// label, or -1.
const alignedLabel = (
  labels: Label[],
  axis: 'x' | 'y',
  pos: number,
): number => {
  let chosen = -1
  let chosenGap = Infinity
  labels.forEach((l, i) => {
    const w = l.word
    const h = height(w)
    const [lo, hi] =
      axis === 'x' ? [w.bbox.x0, w.bbox.x1] : [w.bbox.y0, w.bbox.y1]
    if (pos < lo - h / 2 || pos > hi + h / 2) return
    const gap = Math.abs(l.candidates[0].pos - pos)
    if (gap < chosenGap) {
      chosen = i
      chosenGap = gap
    }
  })
  return chosen
}

// INFO: a marker whose own label was not read (or not read right) still
// gets a value when it sits on a tick of a linear line: within a tenth of a
// step of a grid position, at most one step beyond the outermost label on
// the line. A marker between ticks (a minor tick, a sloppy click) stays
// empty.
const valueOnGrid = (
  labels: Label[],
  line: Line,
  pos: number,
): number | null => {
  if (line.log) return null
  const grid = gridOf(labels, line.fit)
  if (!grid) return null
  const steps = stepsOf(grid, line.a + line.b * pos)
  const k = Math.round(steps)
  if (Math.abs(steps - k) > 0.1 || k < -1 || k > grid.span + 1) return null
  return Number((grid.v0 + k * grid.step).toPrecision(12))
}

// INFO: several OCR passes (the whole figure, the enlarged strips) return
// the same label more than once, sometimes read differently ("-40" and
// "40"). The readings of one label are pooled as its candidates, each with
// its own centre (a lost minus sign shifts the centre); a label counted
// twice would also count twice on the line. When one pass saw a decimal
// point or a minus sign that another pass did not, the reading without it
// costs DROP_COST: those marks get lost, they are rarely invented.
const groupLabels = (words: OcrWord[], axis: 'x' | 'y'): Label[] => {
  const groups: { word: OcrWord; words: OcrWord[] }[] = []
  for (const w of words) {
    const same = groups.find(
      (g) =>
        Math.abs(centreX(g.word) - centreX(w)) < height(w) &&
        Math.abs(centreY(g.word) - centreY(w)) < height(w) / 2,
    )
    if (same) same.words.push(w)
    else groups.push({ word: w, words: [w] })
  }
  const bare = (text: string) => text.replace(/[.-]/g, '')
  return groups.map((g) => {
    const texts = g.words.map((w) => normalizeNumberText(w.text) ?? '')
    const candidates: PlacedCandidate[] = []
    g.words.forEach((w, n) => {
      const pos = axis === 'x' ? centreX(w) : centreY(w)
      const lostMark = texts.some(
        (t) => t.length > texts[n].length && bare(t) === bare(texts[n]),
      )
      for (const c of repairCandidates(w.text)) {
        const cost = c.cost === 0 && lostMark ? DROP_COST : c.cost
        const k = candidates.findIndex((d) => d.value === c.value)
        if (k < 0) candidates.push({ ...c, cost, pos })
        else if (cost < candidates[k].cost) {
          candidates[k] = { ...c, cost, pos }
        }
      }
    })
    return { word: g.word, candidates }
  })
}

// INFO: the numeric words on the label side of one axis line, not farther
// from it than maxGap label heights, and not the other axis's labels (the
// y labels sit beside the y axis line; an x label at the origin straddles
// it, and so on).
const wordsBesideAxis = (
  words: OcrWord[],
  axis: 'x' | 'y',
  sides: LabelSides,
  maxGap: number,
): OcrWord[] => {
  const { xAxisY, yAxisX, xLabelsAbove, yLabelsRight } = sides
  const leftOf = (w: OcrWord, x: number) => w.bbox.x1 <= x
  const rightOf = (w: OcrWord, x: number) => w.bbox.x0 >= x
  const above = (w: OcrWord, y: number) => w.bbox.y1 <= y
  const below = (w: OcrWord, y: number) => w.bbox.y0 >= y
  return words.filter((w) => {
    const h = height(w)
    if (axis === 'x') {
      const y = xAxisY!
      const gap = xLabelsAbove ? y - w.bbox.y1 : w.bbox.y0 - y
      const isYLabel =
        yAxisX !== undefined &&
        (yLabelsRight ? rightOf(w, yAxisX) : leftOf(w, yAxisX))
      return gap >= -2 && gap <= maxGap * h && !isYLabel
    }
    const x = yAxisX!
    const gap = yLabelsRight ? w.bbox.x0 - x : x - w.bbox.x1
    const isXLabel =
      xAxisY !== undefined &&
      (xLabelsAbove ? above(w, xAxisY) : below(w, xAxisY))
    return gap >= -2 && gap <= maxGap * h && !isXLabel
  })
}

export const matchAxisLabels = (
  words: OcrWord[],
  axisCoords: Partial<Record<AxisName, Coord | undefined>>,
  options: LabelMatchOptions = {},
): Partial<Record<AxisName, number>> => {
  const maxGap =
    options.maxGapInLabelHeights ?? DEFAULT_MAX_GAP_IN_LABEL_HEIGHTS
  const minOnLine = options.minLabelsOnLine ?? DEFAULT_MIN_LABELS_ON_LINE
  const numeric = words.filter((w) => parseAxisNumber(w.text) !== null)
  const sides = labelSides(axisCoords)
  const result: Partial<Record<AxisName, number>> = {}

  for (const axis of ['x', 'y'] as const) {
    const names =
      axis === 'x' ? (['x1', 'x2'] as const) : (['y1', 'y2'] as const)
    const markers = names.filter((n) => axisCoords[n])
    if (markers.length === 0) continue
    const besides = wordsBesideAxis(numeric, axis, sides, maxGap)
    const labels = groupLabels(besides, axis)
    const line = bestLine(labels, axis, minOnLine)
    if (!line) continue

    for (const name of markers) {
      const c = axisCoords[name]!
      const pos = axis === 'x' ? c.xPx : c.yPx
      const k = alignedLabel(labels, axis, pos)
      if (k >= 0 && line.fit[k] >= 0) {
        result[name] = labels[k].candidates[line.fit[k]].value
        continue
      }
      const value = valueOnGrid(labels, line, pos)
      if (value !== null) result[name] = value
    }
  }
  return result
}
