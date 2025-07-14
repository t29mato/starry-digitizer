#!/usr/bin/env node

import fs from 'fs'
import Tesseract from 'tesseract.js'
import { createCanvas, loadImage, Canvas } from 'canvas'

interface SimpleAxisResult {
  success: boolean
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  horizontalText?: string
  verticalText?: string
  horizontalValues?: number[]
  verticalValues?: number[]
  error?: string
}

export class SimpleAxisExtractor {
  async extractFromFile(inputPath: string): Promise<SimpleAxisResult> {
    try {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`)
      }

      console.log(`🔍 Loading image: ${inputPath}`)
      const image = await loadImage(inputPath)
      const canvas = createCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)

      console.log(`📐 Image dimensions: ${image.width}x${image.height}`)

      // Simple approach: Extract text from bottom (X-axis) and left (Y-axis) regions
      const results = await Promise.all([
        this.extractBottomRegion(canvas),
        this.extractLeftRegion(canvas),
      ])

      const [horizontalResult, verticalResult] = results

      // Extract numbers from OCR results
      const horizontalValues = this.extractNumbers(horizontalResult.text)
      const verticalValues = this.extractNumbers(verticalResult.text)

      const result: SimpleAxisResult = {
        success: true,
        horizontalText: horizontalResult.text,
        verticalText: verticalResult.text,
        horizontalValues,
        verticalValues,
      }

      // Set axis ranges if we found values
      if (horizontalValues.length >= 2) {
        result.x1 = Math.min(...horizontalValues)
        result.x2 = Math.max(...horizontalValues)
      }

      if (verticalValues.length >= 2) {
        result.y1 = Math.min(...verticalValues)
        result.y2 = Math.max(...verticalValues)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async extractBottomRegion(canvas: Canvas): Promise<{ text: string }> {
    const height = Math.floor(canvas.height * 0.15) // Bottom 15% of image
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

    console.log(
      `🔤 Extracting text from bottom region (${canvas.width}x${height})...`,
    )

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(
            `\r🔍 OCR Progress: ${Math.round(m.progress * 100)}%`,
          )
        }
      },
    })

    console.log(`\n📝 Bottom region text: "${result.data.text.trim()}"`)
    return { text: result.data.text.trim() }
  }

  private async extractLeftRegion(canvas: Canvas): Promise<{ text: string }> {
    const width = Math.floor(canvas.width * 0.15) // Left 15% of image

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

    console.log(
      `🔤 Extracting text from left region (${width}x${canvas.height})...`,
    )

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(
            `\r🔍 OCR Progress: ${Math.round(m.progress * 100)}%`,
          )
        }
      },
    })

    console.log(`\n📝 Left region text: "${result.data.text.trim()}"`)
    return { text: result.data.text.trim() }
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = []

    // Match numbers including decimals and negative numbers
    const matches = text.match(/-?\d*\.?\d+/g)

    if (matches) {
      for (const match of matches) {
        const num = parseFloat(match)
        if (!isNaN(num)) {
          numbers.push(num)
        }
      }
    }

    return numbers.sort((a, b) => a - b)
  }
}

export async function extractAxisFromFile(
  inputPath: string,
  outputPath?: string,
): Promise<void> {
  const extractor = new SimpleAxisExtractor()
  const result = await extractor.extractFromFile(inputPath)

  if (result.success) {
    console.log('\n✅ Axis extraction completed!')

    if (result.x1 !== undefined && result.x2 !== undefined) {
      console.log(`📊 X-axis range: ${result.x1} to ${result.x2}`)
    } else {
      console.log(`📊 X-axis: No numeric range detected`)
    }

    if (result.y1 !== undefined && result.y2 !== undefined) {
      console.log(`📊 Y-axis range: ${result.y1} to ${result.y2}`)
    } else {
      console.log(`📊 Y-axis: No numeric range detected`)
    }

    if (result.horizontalValues && result.horizontalValues.length > 0) {
      console.log(`🔢 X-axis values: [${result.horizontalValues.join(', ')}]`)
    }

    if (result.verticalValues && result.verticalValues.length > 0) {
      console.log(`🔢 Y-axis values: [${result.verticalValues.join(', ')}]`)
    }

    if (outputPath) {
      const output = {
        timestamp: new Date().toISOString(),
        inputFile: inputPath,
        ...result,
      }

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
      console.log(`💾 Results saved to: ${outputPath}`)
    }
  } else {
    console.log(`❌ Extraction failed: ${result.error}`)

    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
      console.log(`💾 Error result saved to: ${outputPath}`)
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
🔧 Simple Axis Extractor CLI

Usage:
  npm run extract-axis-simple <input-image> [--output <output-file>]

Examples:
  npm run extract-axis-simple chart.png
  npm run extract-axis-simple chart.png --output results.json
  npm run extract-axis-simple "/Users/matotomoya/Desktop/Screenshot 2025-06-30 at 21.49.45.png"

Supported formats: PNG, JPEG, GIF, BMP

This tool extracts text from the bottom 15% and left 15% of the image,
then attempts to find numeric values for axis ranges.
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
      console.log('\n🎉 Process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Process failed:', error.message)
      process.exit(1)
    })
}
