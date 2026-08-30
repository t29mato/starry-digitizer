import Tesseract from 'tesseract.js'
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
  async readWords(image: HTMLImageElement): Promise<OcrWord[]> {
    const worker = await Tesseract.createWorker('eng')
    try {
      const { data } = await worker.recognize(image, {}, { blocks: true })
      return flattenOcrWords(data)
    } finally {
      await worker.terminate()
    }
  }
}
