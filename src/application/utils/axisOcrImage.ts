// INFO: docs/design/auto-axis-detection-design.md — the pixel side of
// "Auto-fill values (OCR)". Pure: RGBA pixels in, small grayscale images
// out; no canvas, no DOM, no tesseract.js. AxisOcrReader draws the figure on
// a canvas, hands the pixels to these functions, and gives tesseract.js the
// returned images, so the browser and the Node benchmark run the same code.
//
// Why crop and enlarge: tesseract reads small tick labels (8-12 px high in a
// 600 px wide figure) poorly; dropped decimal points ("0.4" read as "4") and
// minus signs were the most common wrong value. Enlarging only the strips
// next to the axis lines keeps the extra work small.
import { AxisName, Coord, OcrWord } from './axisOcrMatcher'
import { labelSides } from './axisLabelMatcher'

export interface GrayImage {
  width: number
  height: number
  /** one byte per pixel, row-major, 0 = black, 255 = white */
  data: Uint8ClampedArray
}

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

/** A strip of the figure next to one axis line, where its labels are. */
export interface LabelBand {
  axis: 'x' | 'y'
  /** the strip in figure pixels */
  rect: PixelRect
  /** enlargement factor of `image` */
  scale: number
  /** white margin added around `image`, in its own pixels */
  pad: number
  /** the strip, enlarged and padded, dark text on white */
  image: GrayImage
}

// INFO: a transparent pixel is treated as white paper (PNG figures with an
// alpha channel are drawn on a white page), not as black.
export const rgbaToGray = (
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): GrayImage => {
  const data = new Uint8ClampedArray(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]
    const a = pixels[i * 4 + 3] / 255
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    data[i] = Math.round(lum * a + 255 * (1 - a))
  }
  return { width, height, data }
}

// INFO: tesseract expects dark text on a light page. A figure drawn white on
// black (some journals' dark figures) is inverted first; the median pixel is
// the background in any chart, since text and lines cover little of it.
export const normalizePolarity = (image: GrayImage): GrayImage => {
  const histogram = new Array<number>(256).fill(0)
  for (const v of image.data) histogram[v]++
  let seen = 0
  let median = 0
  for (; median < 256; median++) {
    seen += histogram[median]
    if (seen * 2 >= image.data.length) break
  }
  if (median >= 128) return image
  const data = new Uint8ClampedArray(image.data.length)
  for (let i = 0; i < data.length; i++) data[i] = 255 - image.data[i]
  return { ...image, data }
}

export const clampRect = (
  rect: PixelRect,
  width: number,
  height: number,
): PixelRect => {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(width, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(height, Math.ceil(rect.y + rect.height))
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  }
}

// INFO: bilinear, so enlarged glyph edges stay smooth (nearest-neighbour
// blocks make tesseract see the steps as strokes). `pad` adds a white
// margin: tesseract misses text that touches the image edge.
export const cropAndScale = (
  image: GrayImage,
  rect: PixelRect,
  scale: number,
  pad = 0,
): GrayImage => {
  const r = clampRect(rect, image.width, image.height)
  const innerW = Math.max(1, Math.round(r.width * scale))
  const innerH = Math.max(1, Math.round(r.height * scale))
  const width = innerW + pad * 2
  const height = innerH + pad * 2
  const data = new Uint8ClampedArray(width * height).fill(255)
  const at = (x: number, y: number) =>
    image.data[
      Math.min(image.height - 1, Math.max(0, y)) * image.width +
        Math.min(image.width - 1, Math.max(0, x))
    ]
  for (let oy = 0; oy < innerH; oy++) {
    const sy = r.y + (oy + 0.5) / scale - 0.5
    const y0 = Math.floor(sy)
    const fy = sy - y0
    for (let ox = 0; ox < innerW; ox++) {
      const sx = r.x + (ox + 0.5) / scale - 0.5
      const x0 = Math.floor(sx)
      const fx = sx - x0
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
      data[(oy + pad) * width + ox + pad] = top * (1 - fy) + bottom * fy
    }
  }
  return { width, height, data }
}

// INFO: enlarge so the figure's longer side reaches about 2000 px, at most
// 3x (a 600 px figure: 3x, 1000 px: 2x, 2000 px and up: as is). Measured on
// the benchmark: 2x and 3x read about the same; beyond 3x only costs time.
export const bandScale = (width: number, height: number): number =>
  Math.max(1, Math.min(3, 2000 / Math.max(width, height)))

const BAND_PAD = 10

// INFO: the strips where tick labels sit, from the placed markers alone:
// below the x axis line (above it for a top axis), left of the y axis line
// (right of it for a right-hand axis; see labelSides). Each strip reaches a
// little over the line so a label touching it is not cut, and 20 % of the
// figure away from it, which holds the labels of every benchmark figure.
// The whole figure is OCRed as well (AxisOcrReader), so a label outside
// the strips is not lost.
export const labelBands = (
  gray: GrayImage,
  axisCoords: Partial<Record<AxisName, Coord | undefined>>,
): LabelBand[] => {
  const { width, height } = gray
  const sides = labelSides(axisCoords)
  const rects: { axis: 'x' | 'y'; rect: PixelRect }[] = []
  if (sides.xAxisY !== undefined) {
    const y = sides.xAxisY
    const top = sides.xLabelsAbove ? y - height * 0.2 : y - height * 0.03
    rects.push({
      axis: 'x',
      rect: { x: 0, y: top, width, height: height * 0.23 },
    })
  }
  if (sides.yAxisX !== undefined) {
    const x = sides.yAxisX
    const left = sides.yLabelsRight ? x - width * 0.03 : x - width * 0.2
    rects.push({
      axis: 'y',
      rect: { x: left, y: 0, width: width * 0.23, height },
    })
  }
  const scale = bandScale(width, height)
  return rects
    .map(({ axis, rect }) => ({ axis, rect: clampRect(rect, width, height) }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .map(({ axis, rect }) => ({
      axis,
      rect,
      scale,
      pad: BAND_PAD,
      image: cropAndScale(gray, rect, scale, BAND_PAD),
    }))
}

/** Moves words read in a band's image back to figure pixels. */
export const wordsFromBand = (words: OcrWord[], band: LabelBand): OcrWord[] =>
  words.map((w) => ({
    ...w,
    bbox: {
      x0: band.rect.x + (w.bbox.x0 - band.pad) / band.scale,
      y0: band.rect.y + (w.bbox.y0 - band.pad) / band.scale,
      x1: band.rect.x + (w.bbox.x1 - band.pad) / band.scale,
      y1: band.rect.y + (w.bbox.y1 - band.pad) / band.scale,
    },
  }))
