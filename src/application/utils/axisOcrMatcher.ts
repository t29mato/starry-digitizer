// INFO: docs/design/auto-axis-detection-design.md — pure helpers for the
// minimal "OCR axis label auto-fill" feature (HQ #42). No tesseract.js
// import here on purpose: the shapes below are just the subset of
// tesseract.js's Page/Word structure this module actually reads, kept as
// local structural types so this file stays dependency-free and 100%
// Jest-coverable. AxisOcrReader (application/services/axisOcr) is the only
// place that talks to the real tesseract.js library.

export interface OcrBbox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  bbox: OcrBbox
}

interface OcrLine {
  words: OcrWord[]
}

interface OcrParagraph {
  lines: OcrLine[]
}

interface OcrBlock {
  paragraphs: OcrParagraph[]
}

export interface OcrPage {
  blocks: OcrBlock[] | null
}

export const AXIS_NAMES = ['x1', 'x2', 'y1', 'y2'] as const
export type AxisName = (typeof AXIS_NAMES)[number]

export interface Coord {
  xPx: number
  yPx: number
}

export interface MatchOptions {
  /** Ignore a numeric word if it's farther than this from the axis coord
   * (original image pixel space). Default: 150. */
  maxDistancePx?: number
}

const DEFAULT_MAX_DISTANCE_PX = 150

// Matches plain integers/decimals, optionally negative (e.g. "42", "-3.5").
// Deliberately conservative: thousands separators, exponents, and units are
// out of scope for this minimal version (see design doc "known limitations").
const NUMERIC_WORD_PATTERN = /^-?\d+(\.\d+)?$/

export const flattenOcrWords = (page: OcrPage): OcrWord[] => {
  if (!page.blocks) {
    return []
  }
  return page.blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.words),
    ),
  )
}

const bboxCenter = (bbox: OcrBbox): Coord => ({
  xPx: (bbox.x0 + bbox.x1) / 2,
  yPx: (bbox.y0 + bbox.y1) / 2,
})

const distance = (a: Coord, b: Coord): number =>
  Math.hypot(a.xPx - b.xPx, a.yPx - b.yPx)

// Where a tick label is expected to sit relative to its axis marker.
// x-axis (x1/x2) tick labels are printed below the axis line; y-axis
// (y1/y2) tick labels are printed to the left of it. This matters because
// in 2-point calibration mode x1 and y1 (and x2/y2) are placed at the same
// pixel position, so a plain nearest-word search can't tell them apart and
// ends up assigning the x-axis label to y1 too (see #277).
const AXIS_LABEL_DIRECTION: Record<AxisName, 'below' | 'left'> = {
  x1: 'below',
  x2: 'below',
  y1: 'left',
  y2: 'left',
}

// Small slack (original image px) so a label whose bbox center lands just
// barely on the "wrong" side of the marker (e.g. bbox padding, a slightly
// tilted scan) isn't excluded outright.
const DIRECTION_TOLERANCE_PX = 20

// A word counts as being in a given direction from the axis coord only if
// that direction is also the *dominant* offset — i.e. a word mostly below
// the marker (small horizontal drift) counts for "below", but a word far to
// the side (even if technically not above) does not. Without this, a
// y-axis label sitting to the left-and-slightly-below a marker would still
// satisfy a plain "below" half-plane check and could be picked for x1, and
// vice versa for an x-axis label under a "left" check for y1 — which is
// exactly how x1/y1 sharing a pixel position (2-point calibration mode)
// used to cross-match the wrong label (see #277).
const isInAxisLabelDirection = (
  axisName: AxisName,
  coord: Coord,
  wordCenter: Coord,
): boolean => {
  const dx = wordCenter.xPx - coord.xPx
  const dy = wordCenter.yPx - coord.yPx

  if (AXIS_LABEL_DIRECTION[axisName] === 'below') {
    return (
      dy >= -DIRECTION_TOLERANCE_PX &&
      dy >= Math.abs(dx) - DIRECTION_TOLERANCE_PX
    )
  }
  return (
    dx <= DIRECTION_TOLERANCE_PX &&
    Math.abs(dx) >= Math.abs(dy) - DIRECTION_TOLERANCE_PX
  )
}

// INFO: each axis independently picks its own nearest numeric word (among
// those on its expected side, see isInAxisLabelDirection above) — see
// "known limitations" in the design doc for why a single word can still end
// up matching more than one axis.
export const matchOcrWordsToAxisValues = (
  words: OcrWord[],
  axisCoords: Partial<Record<AxisName, Coord | undefined>>,
  options: MatchOptions = {},
): Partial<Record<AxisName, number>> => {
  const maxDistancePx = options.maxDistancePx ?? DEFAULT_MAX_DISTANCE_PX

  const numericWords = words
    .map((word) => ({ word, text: word.text.trim() }))
    .filter(({ text }) => NUMERIC_WORD_PATTERN.test(text))

  const result: Partial<Record<AxisName, number>> = {}

  for (const axisName of AXIS_NAMES) {
    const coord = axisCoords[axisName]
    if (!coord || numericWords.length === 0) {
      continue
    }

    const candidates = numericWords.filter(({ word }) =>
      isInAxisLabelDirection(axisName, coord, bboxCenter(word.bbox)),
    )
    if (candidates.length === 0) {
      continue
    }

    let nearest = candidates[0]
    let nearestDistance = distance(coord, bboxCenter(nearest.word.bbox))
    for (const candidate of candidates.slice(1)) {
      const candidateDistance = distance(coord, bboxCenter(candidate.word.bbox))
      if (candidateDistance < nearestDistance) {
        nearest = candidate
        nearestDistance = candidateDistance
      }
    }

    if (nearestDistance <= maxDistancePx) {
      result[axisName] = parseFloat(nearest.text)
    }
  }

  return result
}
