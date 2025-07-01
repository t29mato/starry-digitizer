#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
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
  debug?: {
    verticalRegions?: string[]
    horizontalRegions?: string[]
  }
}

export class ImprovedAxisExtractor {
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

      // Improved approach: Multiple extraction methods
      const results = await Promise.all([
        this.extractBottomRegionImproved(canvas),
        this.extractLeftRegionImproved(canvas),
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
        debug: {
          verticalRegions: verticalResult.regions,
          horizontalRegions: horizontalResult.regions,
        },
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

  private async extractBottomRegionImproved(
    canvas: Canvas,
  ): Promise<{ text: string; regions: string[] }> {
    const height = Math.floor(canvas.height * 0.15) // Bottom 15% of image
    const y = canvas.height - height

    const regionCanvas = createCanvas(canvas.width, height)
    const ctx = regionCanvas.getContext('2d')

    // Apply image preprocessing
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

    // Enhance contrast
    const imageData = ctx.getImageData(0, 0, canvas.width, height)
    this.enhanceContrast(imageData)
    ctx.putImageData(imageData, 0, 0)

    console.log(
      `🔤 Extracting text from bottom region (${canvas.width}x${height})...`,
    )

    const buffer = regionCanvas.toBuffer('image/png')
    const result = await Tesseract.recognize(buffer, 'eng', {
      psm: 6, // Uniform block of text
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(
            `\r🔍 OCR Progress: ${Math.round(m.progress * 100)}%`,
          )
        }
      },
    })

    console.log(`\n📝 Bottom region text: "${result.data.text.trim()}"`)
    return { text: result.data.text.trim(), regions: [result.data.text.trim()] }
  }

  private async extractLeftRegionImproved(
    canvas: Canvas,
  ): Promise<{ text: string; regions: string[] }> {
    const width = Math.floor(canvas.width * 0.15) // Left 15% of image
    const allTexts: string[] = []
    const allNumbers: string[] = []

    console.log(`🔤 Extracting text from left region using multiple methods...`)

    // Method 1: Full region with improved OCR settings
    const fullResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      canvas.height,
      'Full Y-axis',
    )
    allTexts.push(`Full: ${fullResult}`)

    // Method 2: Split into 3 vertical sections
    const sectionHeight = Math.floor(canvas.height / 3)

    const topResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      sectionHeight,
      'Top section',
    )
    allTexts.push(`Top: ${topResult}`)

    const middleResult = await this.extractSingleRegion(
      canvas,
      0,
      sectionHeight,
      width,
      sectionHeight,
      'Middle section',
    )
    allTexts.push(`Middle: ${middleResult}`)

    const bottomResult = await this.extractSingleRegion(
      canvas,
      0,
      sectionHeight * 2,
      width,
      canvas.height - sectionHeight * 2,
      'Bottom section',
    )
    allTexts.push(`Bottom: ${bottomResult}`)

    // Method 3: Individual character recognition on upper portion
    const upperHeight = Math.floor(canvas.height * 0.3)
    const upperResult = await this.extractSingleRegion(
      canvas,
      0,
      0,
      width,
      upperHeight,
      'Upper 30%',
      8,
    ) // PSM 8 = single word
    allTexts.push(`Upper: ${upperResult}`)

    // Combine all results
    const combinedText = [
      fullResult,
      topResult,
      middleResult,
      bottomResult,
      upperResult,
    ].join(' ')

    console.log(`\n📝 Left region texts:`)
    allTexts.forEach((text) => console.log(`  ${text}`))

    return { text: combinedText, regions: allTexts }
  }

  private async extractSingleRegion(
    canvas: Canvas,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    psm: number = 6,
  ): Promise<string> {
    const regionCanvas = createCanvas(width, height)
    const ctx = regionCanvas.getContext('2d')

    // Extract region
    ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

    // Apply image preprocessing
    const imageData = ctx.getImageData(0, 0, width, height)
    this.enhanceContrast(imageData)
    this.applyThreshold(imageData) // Convert to black and white
    ctx.putImageData(imageData, 0, 0)

    const buffer = regionCanvas.toBuffer('image/png')

    try {
      const result = await Tesseract.recognize(buffer, 'eng', {
        psm: psm,
        logger: () => {}, // Silent for multiple calls
      })

      const text = result.data.text.trim()
      console.log(`  🔍 ${label} (${width}x${height}, PSM${psm}): "${text}"`)
      return text
    } catch (error) {
      console.log(`  ❌ ${label} failed: ${error}`)
      return ''
    }
  }

  private enhanceContrast(imageData: ImageData): void {
    const data = imageData.data
    const factor = 1.5 // Contrast enhancement factor

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast enhancement to RGB channels
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128)) // Red
      data[i + 1] = Math.min(
        255,
        Math.max(0, (data[i + 1] - 128) * factor + 128),
      ) // Green
      data[i + 2] = Math.min(
        255,
        Math.max(0, (data[i + 2] - 128) * factor + 128),
      ) // Blue
      // Alpha channel remains unchanged
    }
  }

  private applyThreshold(imageData: ImageData): void {
    const data = imageData.data
    const threshold = 128

    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

      // Apply threshold
      const value = gray > threshold ? 255 : 0

      data[i] = value // Red
      data[i + 1] = value // Green
      data[i + 2] = value // Blue
      // Alpha channel remains unchanged
    }
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = []

    // Enhanced number matching with better patterns
    const patterns = [
      /-?\d+\.?\d*/g, // Standard numbers (123, 12.3, -12.3)
      /\d+/g, // Simple integers
      /\d+\.\d+/g, // Decimals only
      /[0-6]/g, // Single digits 0-6 (for Y-axis)
    ]

    const allMatches = new Set<string>()

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach((match) => allMatches.add(match))
      }
    }

    // Convert matches to numbers
    for (const match of allMatches) {
      const num = parseFloat(match)
      if (!isNaN(num) && num >= 0 && num <= 1000) {
        // Reasonable range filter
        numbers.push(num)
      }
    }

    // Remove duplicates and sort
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b)

    console.log(`🔢 Extracted numbers: [${uniqueNumbers.join(', ')}]`)
    return uniqueNumbers
  }
}

export async function extractAxisFromFile(
  inputPath: string,
  outputPath?: string,
): Promise<void> {
  const extractor = new ImprovedAxisExtractor()
  const result = await extractor.extractFromFile(inputPath)

  if (result.success) {
    console.log('\n✅ Improved axis extraction completed!')

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

    // Show debug information
    if (result.debug) {
      console.log('\n🔍 Debug Information:')
      if (result.debug.verticalRegions) {
        console.log('Y-axis regions:')
        result.debug.verticalRegions.forEach((region, i) =>
          console.log(`  ${i + 1}. ${region}`),
        )
      }
    }

    if (outputPath) {
      const output = {
        timestamp: new Date().toISOString(),
        inputFile: inputPath,
        improved: true,
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
🔧 Improved Axis Extractor CLI

Usage:
  npm run extract-axis-improved <input-image> [--output <output-file>]

Examples:
  npm run extract-axis-improved chart.png
  npm run extract-axis-improved chart.png --output results.json

Improvements:
  - Multiple OCR attempts with different PSM modes
  - Contrast enhancement and thresholding
  - Y-axis region splitting for better recognition
  - Enhanced number extraction patterns
  - Debug information showing all attempts
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
      console.log('\n🎉 Improved process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Process failed:', error.message)
      process.exit(1)
    })
}
