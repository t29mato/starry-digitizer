import type { WorkerOptions } from 'tesseract.js'
import { AxisOcrReaderInterface } from './axisOcrReaderInterface'
import { flattenOcrWords, OcrWord } from '@/application/utils/axisOcrMatcher'

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

  async readWords(image: HTMLImageElement): Promise<OcrWord[]> {
    // INFO: dynamic import so the ~1MB tesseract.js runtime is only fetched
    // when the user actually presses "Auto-fill values (OCR)" — it must not
    // weigh on the initial bundle of a host app that never uses OCR.
    const { createWorker } = await import('tesseract.js')

    const worker = await createWorker('eng', undefined, this.workerOptions())
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true })
      return flattenOcrWords(data)
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
