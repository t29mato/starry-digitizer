import { AxisName, Coord, OcrWord } from '@/application/utils/axisOcrMatcher'

export interface AxisOcrReaderInterface {
  /**
   * Run OCR over the given image and return every recognized word with its
   * bounding box, in the image's own pixel coordinate space. With the
   * placed axis markers, the strips next to the axis lines are read again,
   * enlarged; their words are added (the same label may appear twice).
   */
  readWords(
    image: HTMLImageElement,
    axisCoords?: Partial<Record<AxisName, Coord | undefined>>,
  ): Promise<OcrWord[]>
}
