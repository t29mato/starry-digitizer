#!/usr/bin/env node

import fs from 'fs'
// import cv from 'opencv4nodejs' // Optional dependency - commented out as it's not installed
import Tesseract from 'tesseract.js'
import { createCanvas, loadImage, Canvas } from 'canvas'
import {
  AxisExtractorInterface,
  AxisExtractionResult,
  DetectedAxis,
  DetectedRegion,
} from '../application/services/axisExtractor/axisExtractorInterface'

export class NodeAxisExtractor implements AxisExtractorInterface {
  constructor() {
    // No initialization needed for Node.js version
  }

  async extractAxisInformation(
    imageData: ImageData,
  ): Promise<AxisExtractionResult | null> {
    try {
      // Step 1: Detect axes using OpenCV
      const detectedAxes = await this.detectAxes(imageData)

      if (!detectedAxes.horizontalAxis && !detectedAxes.verticalAxis) {
        return null
      }

      // Step 2: Extract tick values from detected axes
      let x1 = 0,
        x2 = 1,
        y1 = 0,
        y2 = 1
      let horizontalRegion: DetectedRegion | undefined
      let verticalRegion: DetectedRegion | undefined

      if (detectedAxes.horizontalAxis) {
        const extractionResult = await this.extractTickValuesWithRegion(
          imageData,
          detectedAxes.horizontalAxis,
          'horizontal',
        )
        horizontalRegion = extractionResult.region
        if (extractionResult.values.length >= 2) {
          x1 = Math.min(...extractionResult.values)
          x2 = Math.max(...extractionResult.values)
        }
      }

      if (detectedAxes.verticalAxis) {
        const extractionResult = await this.extractTickValuesWithRegion(
          imageData,
          detectedAxes.verticalAxis,
          'vertical',
        )
        verticalRegion = extractionResult.region
        if (extractionResult.values.length >= 2) {
          y1 = Math.min(...extractionResult.values)
          y2 = Math.max(...extractionResult.values)
        }
      }

      return { x1, x2, y1, y2, horizontalRegion, verticalRegion }
    } catch (error) {
      console.error('Error extracting axis information:', error)
      return null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async detectAxes(imageData: ImageData): Promise<DetectedAxis> {
    // OpenCV functionality is disabled as opencv4nodejs is not installed
    return {}

    /* Original implementation using opencv4nodejs (commented out)
    try {
      // Convert ImageData to OpenCV Mat
      const mat = new cv.Mat(
        Buffer.from(imageData.data.buffer),
        imageData.height,
        imageData.width,
        cv.CV_8UC4,
      )

      // Convert RGBA to BGR for OpenCV
      const bgr = mat.cvtColor(cv.COLOR_RGBA2BGR)
      const gray = bgr.cvtColor(cv.COLOR_BGR2GRAY)

      // Apply edge detection
      const edges = gray.canny(50, 150)

      // Detect lines using HoughLinesP
      const lines = edges.houghLinesP(1, Math.PI / 180, 50, 50, 10)

      const detectedAxes: DetectedAxis = {}

      // Find horizontal and vertical lines
      for (const line of lines) {
        const [x1, y1, x2, y2] = line
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
        const isHorizontal = Math.abs(angle) < 15 || Math.abs(angle - 180) < 15
        const isVertical =
          Math.abs(angle - 90) < 15 || Math.abs(angle + 90) < 15

        if (isHorizontal) {
          const lineY = (y1 + y2) / 2
          if (
            !detectedAxes.horizontalAxis ||
            lineY > detectedAxes.horizontalAxis.y
          ) {
            detectedAxes.horizontalAxis = {
              x1: Math.min(x1, x2),
              x2: Math.max(x1, x2),
              y: lineY,
            }
          }
        }

        if (isVertical) {
          const lineX = (x1 + x2) / 2
          if (
            !detectedAxes.verticalAxis ||
            lineX < detectedAxes.verticalAxis.x
          ) {
            detectedAxes.verticalAxis = {
              x: lineX,
              y1: Math.min(y1, y2),
              y2: Math.max(y1, y2),
            }
          }
        }
      }

      return detectedAxes
    } catch (error) {
      console.error('Error detecting axes:', error)
      return {}
    }
    */
  }

  async extractTickValuesWithRegion(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<{ values: number[]; region: DetectedRegion }> {
    try {
      const canvas = createCanvas(imageData.width, imageData.height)
      const ctx = canvas.getContext('2d')

      // Create ImageData for canvas
      const canvasImageData = ctx.createImageData(
        imageData.width,
        imageData.height,
      )
      canvasImageData.data.set(imageData.data)
      ctx.putImageData(canvasImageData, 0, 0)

      let roiCanvas: Canvas
      let regionInfo: { x: number; y: number; width: number; height: number }

      if (orientation === 'horizontal') {
        const roiHeight = Math.floor(imageData.height * 0.08)
        const roiY = Math.min(
          axis.y + Math.floor(imageData.height * 0.005),
          imageData.height - roiHeight,
        )
        const roiX = axis.x1
        const roiWidth = imageData.width - axis.x1

        roiCanvas = createCanvas(roiWidth, roiHeight)
        const roiCtx = roiCanvas.getContext('2d')
        roiCtx.drawImage(
          canvas,
          roiX,
          roiY,
          roiWidth,
          roiHeight,
          0,
          0,
          roiWidth,
          roiHeight,
        )
        regionInfo = { x: roiX, y: roiY, width: roiWidth, height: roiHeight }
      } else {
        const desiredRoiWidth = Math.floor(imageData.width * 0.12)
        const minWidth = Math.floor(imageData.width * 0.05)
        const maxRoiWidth = Math.max(
          axis.x - Math.floor(imageData.width * 0.02),
          minWidth,
        )
        const roiWidth = Math.min(desiredRoiWidth, maxRoiWidth)
        const roiX = axis.x - roiWidth
        const roiY = 0
        const roiHeight = axis.y2

        roiCanvas = createCanvas(roiWidth, roiHeight)
        const roiCtx = roiCanvas.getContext('2d')
        roiCtx.drawImage(
          canvas,
          roiX,
          roiY,
          roiWidth,
          roiHeight,
          0,
          0,
          roiWidth,
          roiHeight,
        )
        regionInfo = { x: roiX, y: roiY, width: roiWidth, height: roiHeight }
      }

      // Convert canvas to buffer for Tesseract
      const buffer = roiCanvas.toBuffer('image/png')

      const result = await Tesseract.recognize(buffer, 'eng', {
        logger: () => {},
      })

      const numbers: number[] = []
      const confidenceThreshold = 40

      if (result.data.confidence >= confidenceThreshold) {
        console.log('OCR Result:', result.data.text)
        const lines = result.data.text.split('\n')
        for (const line of lines) {
          const matches = line.match(/-?\d*\.?\d+/g)
          if (matches) {
            for (const match of matches) {
              const num = parseFloat(match)
              if (!isNaN(num)) {
                numbers.push(num)
              }
            }
          }
        }
      }

      const detectedRegion: DetectedRegion = {
        x: regionInfo.x,
        y: regionInfo.y,
        width: regionInfo.width,
        height: regionInfo.height,
        extractedText: result.data.text.trim(),
        extractedValues: [...numbers].sort((a, b) => a - b),
        axisPosition:
          orientation === 'horizontal' ? { y: axis.y } : { x: axis.x },
      }

      return {
        values: [...numbers].sort((a, b) => a - b),
        region: detectedRegion,
      }
    } catch (error) {
      console.error('Error extracting tick values:', error)
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

  async extractTickValues(
    imageData: ImageData,
    axis: any,
    orientation: 'horizontal' | 'vertical',
  ): Promise<number[]> {
    const result = await this.extractTickValuesWithRegion(
      imageData,
      axis,
      orientation,
    )
    return result.values
  }

  // Utility method to load image file and convert to ImageData
  async loadImageFromFile(filePath: string): Promise<ImageData> {
    const image = await loadImage(filePath)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)

    return ctx.getImageData(0, 0, image.width, image.height) as any
  }
}

// CLI functionality
export async function extractAxisFromFile(
  inputPath: string,
  outputPath?: string,
): Promise<void> {
  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`)
    }

    console.log(`🔍 Processing image: ${inputPath}`)

    const extractor = new NodeAxisExtractor()
    const imageData = await extractor.loadImageFromFile(inputPath)

    console.log(`📐 Image dimensions: ${imageData.width}x${imageData.height}`)

    const result = await extractor.extractAxisInformation(imageData)

    if (result) {
      console.log('✅ Axis extraction successful!')
      console.log(`📊 X-axis range: ${result.x1} to ${result.x2}`)
      console.log(`📊 Y-axis range: ${result.y1} to ${result.y2}`)

      if (result.horizontalRegion) {
        console.log(`🔤 X-axis OCR: "${result.horizontalRegion.extractedText}"`)
        console.log(
          `🔢 X-axis values: [${result.horizontalRegion.extractedValues.join(
            ', ',
          )}]`,
        )
      }

      if (result.verticalRegion) {
        console.log(`🔤 Y-axis OCR: "${result.verticalRegion.extractedText}"`)
        console.log(
          `🔢 Y-axis values: [${result.verticalRegion.extractedValues.join(
            ', ',
          )}]`,
        )
      }

      if (outputPath) {
        const output = {
          success: true,
          timestamp: new Date().toISOString(),
          inputFile: inputPath,
          imageDimensions: {
            width: imageData.width,
            height: imageData.height,
          },
          axisData: result,
        }

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
        console.log(`💾 Results saved to: ${outputPath}`)
      }
    } else {
      console.log('❌ No axes detected in the image')

      if (outputPath) {
        const output = {
          success: false,
          timestamp: new Date().toISOString(),
          inputFile: inputPath,
          error: 'No axes detected in the image',
        }

        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
        console.log(`💾 Error result saved to: ${outputPath}`)
      }
    }
  } catch (error) {
    console.error('❌ Error during axis extraction:', error)
    throw error
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
🔧 Node.js Axis Extractor CLI

Usage:
  node nodeAxisExtractor.js <input-image> [--output <output-file>]

Examples:
  node nodeAxisExtractor.js chart.png
  node nodeAxisExtractor.js chart.png --output results.json
  node nodeAxisExtractor.js /path/to/image.png --output /path/to/results.json

Supported formats: PNG, JPEG, GIF, BMP
`)
    process.exit(1)
  }

  const inputPath = args[0]
  const outputIndex = args.indexOf('--output')
  const outputPath =
    outputIndex !== -1 && outputIndex + 1 < args.length
      ? args[outputIndex + 1]
      : undefined

  extractAxisFromFile(inputPath, outputPath)
    .then(() => {
      console.log('🎉 Process completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Process failed:', error.message)
      process.exit(1)
    })
}
