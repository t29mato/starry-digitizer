import { OcrWord } from '@/application/utils/axisOcrMatcher'

export interface AxisOcrReaderInterface {
  /**
   * Run OCR over the given image and return every recognized word with its
   * bounding box, in the image's own pixel coordinate space.
   */
  readWords(image: HTMLImageElement): Promise<OcrWord[]>
}
