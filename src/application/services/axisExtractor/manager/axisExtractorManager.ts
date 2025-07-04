import { AxisExtractor } from '../axisExtractor'
import {
  AxisExtractorInterface,
  AxisExtractionResult,
} from '../axisExtractorInterface'

export class AxisExtractorManager {
  private axisExtractor: AxisExtractor

  constructor() {
    this.axisExtractor = new AxisExtractor()
  }

  setDebugMode(debug: boolean): void {
    this.axisExtractor.setDebug(debug)
  }

  async extractAxisInformationFromImage(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    try {
      return await this.axisExtractor.extractAxisInformation(imageData)
    } catch (error) {
      // Only log in non-test environments to reduce noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to extract axis information:', error)
      }
      return null
    }
  }

  async extractAxisInformationFromImageFile(
    file: File,
  ): Promise<AxisExtractionResult | null> {
    try {
      const imageData = await this.loadImageFileAsImageData(file)
      return await this.extractAxisInformationFromImage(imageData)
    } catch (error) {
      // Only log in non-test environments to reduce noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to extract axis information from file:', error)
      }
      return null
    }
  }

  async extractAxisInformationFromCanvas(
    canvas: HTMLCanvasElement,
  ): Promise<AxisExtractionResult | null> {
    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      return await this.extractAxisInformationFromImage(imageData)
    } catch (error) {
      // Only log in non-test environments to reduce noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to extract axis information from canvas:', error)
      }
      return null
    }
  }

  private async loadImageFileAsImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        resolve(imageData)
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }
}
