// WIPWIPWIPWIPWIPWIP
import { Plot } from '@/types'
import Color from 'color'

interface Extractor {
  run(): Plot[]
}

export class SymbolExtractor implements Extractor {
  constructor(
    private imgCanvas: HTMLCanvasElement,
    private maskCanvas: HTMLCanvasElement
  ) {}

  run(color: Color) {
    const imgCtx = this.imgCanvas.getContext('2d') as CanvasRenderingContext2D
    const maskCtx = this.maskCanvas.getContext('2d') as CanvasRenderingContext2D
    const width = this.maskCanvas.width
    const height = this.maskCanvas.height
    const maskColors = maskCtx.getImageData(0, 0, width, height).data
    const imgColors = imgCtx.getImageData(0, 0, width, height).data
    for (let hi = 0; hi < height; hi++) {
      for (let wi = 0; wi < width; wi++) {}
    }
    return []
  }
}
