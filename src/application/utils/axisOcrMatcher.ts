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

// INFO: each axis independently picks its own nearest numeric word — see
// "known limitations" in the design doc for why a single word can end up
// matching more than one axis.
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

    let nearest = numericWords[0]
    let nearestDistance = distance(coord, bboxCenter(nearest.word.bbox))
    for (const candidate of numericWords.slice(1)) {
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
