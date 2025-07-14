import fs from 'fs'
import Tesseract from 'tesseract.js'
import { createCanvas, loadImage, Canvas } from 'canvas'
import {
  AxisExtractorInterface,
  AxisExtractionResult,
  DetectedAxis,
  DetectedRegion,
} from './axisExtractorInterface'

export interface NodeAxisExtractionResult extends AxisExtractionResult {
  debug?: {
    verticalRegions?: string[]
    horizontalRegions?: string[]
    ocrConfidence?: number
  }
}

export class NodeAxisExtractor implements AxisExtractorInterface {
  private useImprovedMode: boolean

  constructor(useImprovedMode: boolean = false) {
    this.useImprovedMode = useImprovedMode
  }

  async extractAxisInformation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    // This method expects browser ImageData, so we need to convert from our Node.js canvas
    throw new Error(
      'Use extractAxisInformationFromFile for Node.js environment',
    )
  }

  async extractAxisInformationFromFile(
    filePath: string,
  ): Promise<NodeAxisExtractionResult | null> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Image file not found: ${filePath}`)
      }

      const image = await loadImage(filePath)
      const canvas = createCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)

      if (this.useImprovedMode) {
        return await this.extractAxisInformationImproved(canvas)
      } else {
        return await this.extractAxisInformationSimple(canvas)
      }
    } catch (error) {
      console.error('Error extracting axis information:', error)
      return null
    }
  }

  private async extractAxisInformationSimple(
    canvas: Canvas,
  ): Promise<NodeAxisExtractionResult | null> {
    try {
      // Simple extraction method
      const [horizontalResult, verticalResult] = await Promise.all([
        this.extractBottomRegion(canvas),
        this.extractLeftRegion(canvas),
      ])

      const horizontalValues = this.extractNumbers(horizontalResult)
      const verticalValues = this.extractNumbers(verticalResult)

      if (horizontalValues.length === 0 && verticalValues.length === 0) {
        return null
      }

      let x1 = 0,
        x2 = 1,
        y1 = 0,
        y2 = 1

      if (horizontalValues.length >= 2) {
        x1 = Math.min(...horizontalValues)
        x2 = Math.max(...horizontalValues)
      }

      if (verticalValues.length >= 2) {
        y1 = Math.min(...verticalValues)
        y2 = Math.max(...verticalValues)
      }

      return {
        x1,
        x2,
        y1,
        y2,
        horizontalRegion: {
          x: 0,
          y: canvas.height - Math.floor(canvas.height * 0.15),
          width: canvas.width,
          height: Math.floor(canvas.height * 0.15),
          extractedText: horizontalResult,
          extractedValues: horizontalValues,
        },
        verticalRegion: {
          x: 0,
          y: 0,
          width: Math.floor(canvas.width * 0.15),
          height: canvas.height,
          extractedText: verticalResult,
          extractedValues: verticalValues,
        },
      }
    } catch (error) {
      console.error('Error in simple extraction:', error)
      return null
    }
  }

  private async extractAxisInformationImproved(
    canvas: Canvas,
  ): Promise<NodeAxisExtractionResult | null> {
    try {
      // Improved extraction method
      const [horizontalResult, verticalResult] = await Promise.all([
        this.extractBottomRegionImproved(canvas),
        this.extractLeftRegionImproved(canvas),
      ])

      const horizontalValues = this.extractNumbersImproved(
        horizontalResult.text,
      )
      const verticalValues = this.extractNumbersImproved(verticalResult.text)

      if (horizontalValues.length === 0 && verticalValues.length === 0) {
        return null
      }

      let x1 = 0,
        x2 = 1,
        y1 = 0,
        y2 = 1

      if (horizontalValues.length >= 2) {
        x1 = Math.min(...horizontalValues)
        x2 = Math.max(...horizontalValues)
      }

      if (verticalValues.length >= 2) {
        y1 = Math.min(...verticalValues)
        y2 = Math.max(...verticalValues)
      }

      return {
        x1,
        x2,
        y1,
        y2,
        horizontalRegion: {
          x: 0,
          y: canvas.height - Math.floor(canvas.height * 0.15),
          width: canvas.width,
          height: Math.floor(canvas.height * 0.15),
          extractedText: horizontalResult.text,
          extractedValues: horizontalValues,
        },
        verticalRegion: {
          x: 0,
          y: 0,
          width: Math.floor(canvas.width * 0.15),
          height: canvas.height,
          extractedText: verticalResult.text,
          extractedValues: verticalValues,
        },
        debug: {
          verticalRegions: verticalResult.regions,
          horizontalRegions: [horizontalResult.text],
        },
      }
    } catch (error) {
      console.error('Error in improved extraction:', error)
      return null
    }
  }

  private async extractBottomRegion(canvas: Canvas): Promise<string> {
    const height = Math.floor(canvas.height * 0.15)
    const y = canvas.height - height

    const regionCanvas = createCanvas(canvas.width, height)
    const ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      height,
      0,
      0,
      canvas.width,
      height,
    )

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {}, // Silent for tests
    })

    return result.data.text.trim()
  }

  private async extractLeftRegion(canvas: Canvas): Promise<string> {
    const width = Math.floor(canvas.width * 0.15)

    const regionCanvas = createCanvas(width, canvas.height)
    const ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      0,
      width,
      canvas.height,
      0,
      0,
      width,
      canvas.height,
    )

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {}, // Silent for tests
    })

    return result.data.text.trim()
  }

  private async extractBottomRegionImproved(
    canvas: Canvas,
  ): Promise<{ text: string; regions: string[] }> {
    const height = Math.floor(canvas.height * 0.15)
    const y = canvas.height - height

    const regionCanvas = createCanvas(canvas.width, height)
    const ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      height,
      0,
      0,
      canvas.width,
      height,
    )

    // Apply preprocessing
    const imageData = ctx.getImageData(0, 0, canvas.width, height)
    this.enhanceContrast(imageData as any)
    ctx.putImageData(imageData, 0, 0)

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      psm: 6,
      logger: () => {},
    } as any)

    const text = result.data.text.trim()
    return { text, regions: [text] }
  }

  private async extractLeftRegionImproved(
    canvas: Canvas,
  ): Promise<{ text: string; regions: string[] }> {
    const width = Math.floor(canvas.width * 0.15)
    const allTexts: string[] = []

    // Method 1: Full region
    const fullResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      canvas.height,
      6,
    )
    allTexts.push(fullResult)

    // Method 2: Split into sections
    const sectionHeight = Math.floor(canvas.height / 3)
    const topResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      sectionHeight,
      6,
    )
    const middleResult = await this.extractSingleRegion(
      canvas,
      0,
      sectionHeight,
      width,
      sectionHeight,
      6,
    )
    const bottomResult = await this.extractSingleRegion(
      canvas,
      0,
      sectionHeight * 2,
      width,
      canvas.height - sectionHeight * 2,
      6,
    )

    allTexts.push(topResult, middleResult, bottomResult)

    // Method 3: Upper portion with single word mode
    const upperHeight = Math.floor(canvas.height * 0.3)
    const upperResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      upperHeight,
      8,
    )
    allTexts.push(upperResult)

    const combinedText = allTexts.join(' ')
    return { text: combinedText, regions: allTexts }
  }

  private async extractSingleRegion(
    canvas: Canvas,
    x: number,
    y: number,
    width: number,
    height: number,
    psm: number = 6,
  ): Promise<string> {
    const regionCanvas = createCanvas(width, height)
    const ctx = regionCanvas.getContext('2d')
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

    // Apply preprocessing
    const imageData = ctx.getImageData(0, 0, width, height)
    this.enhanceContrast(imageData as any)
    this.applyThreshold(imageData as any)
    ctx.putImageData(imageData, 0, 0)

    const buffer = regionCanvas.toBuffer('image/png')

    try {
      const result = await Tesseract.recognize(buffer, 'eng', {
        psm: psm,
        logger: () => {},
      } as any)
      return result.data.text.trim()
    } catch (error) {
      return ''
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

  private extractNumbers(text: string): number[] {
    const numbers: number[] = []
    const matches = text.match(/-?\d*\.?\d+/g)

    if (matches) {
      for (const match of matches) {
        const num = parseFloat(match)
        if (!isNaN(num)) {
          numbers.push(num)
        }
      }
    }

    return [...new Set(numbers)].sort((a, b) => a - b)
  }

  private extractNumbersImproved(text: string): number[] {
    const numbers: number[] = []
    const patterns = [/-?\d+\.?\d*/g, /\d+/g, /\d+\.\d+/g, /[0-6]/g]

    const allMatches = new Set<string>()

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach((match) => allMatches.add(match))
      }
    }

    for (const match of allMatches) {
      const num = parseFloat(match)
      if (!isNaN(num) && num >= 0 && num <= 1000) {
        numbers.push(num)
      }
    }

    return [...new Set(numbers)].sort((a, b) => a - b)
  }

  // Placeholder methods to satisfy AxisExtractorInterface
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectAxes(_imageData: ImageData): Promise<DetectedAxis> {
    return {}
  }

  async extractTickValues(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _imageData: ImageData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _axis: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _orientation: 'horizontal' | 'vertical',
  ): Promise<number[]> {
    return []
  }

  async extractTickValuesWithRegion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _imageData: ImageData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _axis: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _orientation: 'horizontal' | 'vertical',
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    return {
      values: [],
      region: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        extractedText: '',
        extractedValues: [],
      },
    }
  }
}
