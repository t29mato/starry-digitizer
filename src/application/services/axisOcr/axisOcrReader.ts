import type { WorkerOptions } from 'tesseract.js'
import { AxisOcrReaderInterface } from './axisOcrReaderInterface'
import {
  AxisName,
  Coord,
  flattenOcrWords,
  OcrWord,
} from '@/application/utils/axisOcrMatcher'
import type { GrayImage } from '@/application/utils/axisOcrImage'

// INFO: docs/design/auto-axis-detection-design.md — the only place in the
// app that calls into tesseract.js directly. Kept intentionally thin: all
// matching logic lives in the framework-free axisOcrMatcher util so it can
// be unit tested without pulling in the (WASM-backed, slow-to-init)
// tesseract.js runtime.
//
// INFO (bug fix, HQ #42): we can't use the `Tesseract.recognize()`
// convenience function here — it always calls `worker.recognize(image)`
// with tesseract.js's own default output format, which is `{ text: true }`
// only (see node_modules/tesseract.js/src/createWorker.js). `data.blocks`
// stays null in that case, so flattenOcrWords() always saw zero words,
// identically on every environment (this was never actually Vercel/asset-
// path specific, despite reproducing there). Creating the worker ourselves
// lets us pass `{ blocks: true }` as the recognize() output format so the
// blocks > paragraphs > lines > words tree (and each word's bbox) actually
// gets populated.
export class AxisOcrReader implements AxisOcrReaderInterface {
  // INFO: When StarryDigitizer is embedded in a host app, the tesseract
  // worker/core/traineddata are served from wherever the host put the
  // library's assets. `assetBaseUrl` (the <starry-digitizer> prop of the
  // same name) points at that directory; when it is omitted we pass no
  // paths at all so tesseract.js keeps resolving them itself (unpkg CDN /
  // bundler defaults), which is what the standalone app relies on.
  constructor(private readonly assetBaseUrl?: string) {}

  // INFO: two kinds of pass, all on one worker:
  //   1. the whole figure as it is, with tesseract.js's default page mode
  //      (one block of text) — what this reader always did;
  //   2. the strips next to the placed axis lines, enlarged up to 3x
  //      (axisOcrImage.labelBands), in "sparse text" mode, which finds
  //      scattered labels without assuming lines of text.
  // The matcher pools the readings of each label from both. On the
  // benchmark the strips alone read fewer labels than both together
  // (docs/design/auto-axis-detection-design.md). Without axis coords (or
  // when the canvas cannot be read) only pass 1 runs.
  async readWords(
    image: HTMLImageElement,
    axisCoords: Partial<Record<AxisName, Coord | undefined>> = {},
  ): Promise<OcrWord[]> {
    // INFO: dynamic import so the ~1MB tesseract.js runtime is only fetched
    // when the user actually presses "Auto-fill values (OCR)" — it must not
    // weigh on the initial bundle of a host app that never uses OCR. The
    // pixel helpers come along the same way.
    const [{ createWorker, PSM }, ocrImage] = await Promise.all([
      import('tesseract.js'),
      import('@/application/utils/axisOcrImage'),
    ])
    const { labelBands, normalizePolarity, rgbaToGray, wordsFromBand } =
      ocrImage

    const worker = await createWorker('eng', undefined, this.workerOptions())
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true })
      const words = flattenOcrWords(data)
      const pixels = readPixels(image)
      const bands = pixels
        ? labelBands(
            normalizePolarity(
              rgbaToGray(pixels.rgba, pixels.width, pixels.height),
            ),
            axisCoords,
          )
        : []
      if (bands.length === 0) return words
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      })
      for (const band of bands) {
        const { data: bandData } = await worker.recognize(
          toCanvas(band.image),
          {},
          { blocks: true },
        )
        words.push(...wordsFromBand(flattenOcrWords(bandData), band))
      }
      return words
    } finally {
      await worker.terminate()
    }
  }

  private workerOptions(): Partial<WorkerOptions> | undefined {
    if (!this.assetBaseUrl) {
      return undefined
    }
    // INFO: corePath is a directory (tesseract.js appends the core file
    // name itself), workerPath is a file, langPath is a directory.
    const base = this.assetBaseUrl.replace(/\/+$/, '')
    return {
      workerPath: `${base}/worker.min.js`,
      corePath: `${base}/`,
      langPath: base,
    }
  }
}

const toCanvas = (gray: GrayImage): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = gray.width
  canvas.height = gray.height
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const imageData = ctx.createImageData(gray.width, gray.height)
  for (let i = 0; i < gray.data.length; i++) {
    imageData.data[i * 4] = gray.data[i]
    imageData.data[i * 4 + 1] = gray.data[i]
    imageData.data[i * 4 + 2] = gray.data[i]
    imageData.data[i * 4 + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// INFO: the figure's own pixels, at natural size (the axis coords are in
// those pixels). null when the canvas cannot be read (no 2D context in the
// environment, a cross-origin image that taints the canvas).
const readPixels = (
  image: HTMLImageElement,
): { rgba: Uint8ClampedArray; width: number; height: number } | null => {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(image, 0, 0, width, height)
    return { rgba: ctx.getImageData(0, 0, width, height).data, width, height }
  } catch {
    return null
  }
}
