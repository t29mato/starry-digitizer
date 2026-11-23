// INFO: docs/design/auto-axis-detection-design.md — the OCR word shapes of
// the "OCR axis label auto-fill" feature (HQ #42). No tesseract.js import
// here on purpose: the shapes below are just the subset of tesseract.js's
// Page/Word structure this module actually reads, kept as local structural
// types so this file stays dependency-free and 100% Jest-coverable.
// AxisOcrReader (application/services/axisOcr) is the only place that talks
// to the real tesseract.js library; axisLabelMatcher.ts picks the value of
// each marker from the words.

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
