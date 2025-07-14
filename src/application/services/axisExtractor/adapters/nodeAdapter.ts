import {
  AxisExtractorAdapter,
  ImageProcessingResult,
  RegionExtraction,
} from './axisExtractorAdapter'
import fs from 'fs'
import { createCanvas, loadImage, Canvas } from 'canvas'
import Tesseract from 'tesseract.js'

export class NodeAdapter implements AxisExtractorAdapter {
  async loadImageFromFile(filePath: string): Promise<Canvas> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Image file not found: ${filePath}`)
    }

    const image = await loadImage(filePath)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)

    return canvas
  }

  async loadImageFromCanvas(htmlCanvas: HTMLCanvasElement): Promise<Canvas> {
    // Convert HTMLCanvasElement to node-canvas Canvas
    const canvas = createCanvas(htmlCanvas.width, htmlCanvas.height)
    const ctx = canvas.getContext('2d')

    // Get image data from HTML canvas
    const htmlCtx = htmlCanvas.getContext('2d')
    if (!htmlCtx) {
      throw new Error('Failed to get HTML canvas context')
    }

    const imageData = htmlCtx.getImageData(
      0,
      0,
      htmlCanvas.width,
      htmlCanvas.height,
    )
    ctx.putImageData(imageData, 0, 0)

    return canvas
  }

  async detectAxes(canvas: Canvas): Promise<{
    horizontalAxis?: { x1: number; x2: number; y: number }
    verticalAxis?: { x: number; y1: number; y2: number }
  }> {
    // Note: Node.jsでのOpenCV処理は複雑なため、簡易的な軸検出を実装
    // 実際のプロジェクトでは opencv4nodejs を使用することを推奨

    // 簡易的な軸検出: 画像の下部と左部に軸があると仮定
    const width = canvas.width
    const height = canvas.height

    return {
      horizontalAxis: {
        x1: Math.floor(width * 0.1),
        x2: Math.floor(width * 0.9),
        y: Math.floor(height * 0.85),
      },
      verticalAxis: {
        x: Math.floor(width * 0.1),
        y1: Math.floor(height * 0.1),
        y2: Math.floor(height * 0.85),
      },
    }
  }

  async extractTextFromRegion(
    canvas: Canvas,
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      psm?: number
      enhanceContrast?: boolean
      applyThreshold?: boolean
    } = {},
  ): Promise<ImageProcessingResult> {
    try {
      const regionCanvas = createCanvas(width, height)
      const ctx = regionCanvas.getContext('2d')

      // 指定領域を抽出
      ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

      // 画像前処理
      if (options.enhanceContrast || options.applyThreshold) {
        const imageData = ctx.getImageData(0, 0, width, height)

        if (options.enhanceContrast) {
          this.enhanceContrast(imageData as any)
        }

        if (options.applyThreshold) {
          this.applyThreshold(imageData as any)
        }

        ctx.putImageData(imageData, 0, 0)
      }

      const buffer = regionCanvas.toBuffer('image/png')
      const result = await Tesseract.recognize(buffer, 'eng', {
        psm: options.psm || 6,
        logger: () => {},
      } as any)

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence,
      }
    } catch (error) {
      console.error('Error extracting text from region:', error)
      return {
        text: '',
        confidence: 0,
      }
    }
  }

  async extractTextFromMultipleRegions(
    canvas: Canvas,
    regions: Array<{
      x: number
      y: number
      width: number
      height: number
      psm?: number
    }>,
  ): Promise<RegionExtraction> {
    const allTexts: string[] = []

    for (const region of regions) {
      const result = await this.extractTextFromRegion(
        canvas,
        region.x,
        region.y,
        region.width,
        region.height,
        {
          psm: region.psm || 6,
          enhanceContrast: true,
          applyThreshold: true,
        },
      )

      if (result.text) {
        allTexts.push(result.text)
      }
    }

    return {
      text: allTexts.join(' '),
      regions: allTexts,
    }
  }

  private enhanceContrast(imageData: ImageData): void {
    const data = imageData.data
    const factor = 1.5

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))
      data[i + 1] = Math.min(
        255,
        Math.max(0, (data[i + 1] - 128) * factor + 128),
      )
      data[i + 2] = Math.min(
        255,
        Math.max(0, (data[i + 2] - 128) * factor + 128),
      )
    }
  }

  private applyThreshold(imageData: ImageData): void {
    const data = imageData.data
    const threshold = 128

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const value = gray > threshold ? 255 : 0

      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
    }
  }

  isEnvironmentSupported(): boolean {
    return typeof process !== 'undefined' && typeof require !== 'undefined'
  }

  getEnvironmentName(): string {
    return 'Node.js'
  }
}
