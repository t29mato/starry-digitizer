import Tesseract from 'tesseract.js'
import { AxisOcrReaderInterface } from './axisOcrReaderInterface'
import { flattenOcrWords, OcrWord } from '@/application/utils/axisOcrMatcher'

// INFO: docs/design/auto-axis-detection-design.md — the only place in the
// app that calls into tesseract.js directly. Kept intentionally thin: all
// matching logic lives in the framework-free axisOcrMatcher util so it can
// be unit tested without pulling in the (WASM-backed, slow-to-init)
// tesseract.js runtime.
export class AxisOcrReader implements AxisOcrReaderInterface {
  async readWords(image: HTMLImageElement): Promise<OcrWord[]> {
    const { data } = await Tesseract.recognize(image, 'eng')
    return flattenOcrWords(data)
  }
}
