#!/usr/bin/env node

import fs from 'fs'
import { createCanvas, loadImage, Canvas } from 'canvas'

export class DebugAxisExtractor {
  async debugRegions(inputPath: string): Promise<void> {
    try {
      console.log(`🔍 Loading image: ${inputPath}`)
      const image = await loadImage(inputPath)
      const canvas = createCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)

      console.log(`📐 Image dimensions: ${image.width}x${image.height}`)

      // Save original image
      const originalBuffer = canvas.toBuffer('image/png')
      fs.writeFileSync('/tmp/debug_original.png', originalBuffer)
      console.log('💾 Original image saved: /tmp/debug_original.png')

      // Extract and save left region (current method)
      await this.debugLeftRegion(canvas, 0.15, 'current')

      // Extract and save left region with different widths
      await this.debugLeftRegion(canvas, 0.1, '10percent')
      await this.debugLeftRegion(canvas, 0.2, '20percent')
      await this.debugLeftRegion(canvas, 0.25, '25percent')

      // Extract different vertical sections
      await this.debugLeftVerticalSections(canvas)
    } catch (error) {
      console.error('❌ Debug failed:', error)
    }
  }

  private async debugLeftRegion(
    canvas: Canvas,
    widthPercent: number,
    label: string,
  ): Promise<void> {
    const width = Math.floor(canvas.width * widthPercent)

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
    const filename = `/tmp/debug_left_${label}_${width}x${canvas.height}.png`
    fs.writeFileSync(filename, buffer)
    console.log(`💾 Left region (${widthPercent * 100}%) saved: ${filename}`)
  }

  private async debugLeftVerticalSections(canvas: Canvas): Promise<void> {
    const width = Math.floor(canvas.width * 0.15) // 15%幅
    const sectionHeight = Math.floor(canvas.height / 3) // 3分割

    // Top section
    let regionCanvas = createCanvas(width, sectionHeight)
    let ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      0,
      width,
      sectionHeight,
      0,
      0,
      width,
      sectionHeight,
    )
    let buffer = regionCanvas.toBuffer('image/png')
    fs.writeFileSync('/tmp/debug_left_top.png', buffer)
    console.log('💾 Left top section saved: /tmp/debug_left_top.png')

    // Middle section
    regionCanvas = createCanvas(width, sectionHeight)
    ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      sectionHeight,
      width,
      sectionHeight,
      0,
      0,
      width,
      sectionHeight,
    )
    buffer = regionCanvas.toBuffer('image/png')
    fs.writeFileSync('/tmp/debug_left_middle.png', buffer)
    console.log('💾 Left middle section saved: /tmp/debug_left_middle.png')

    // Bottom section
    regionCanvas = createCanvas(width, sectionHeight)
    ctx = regionCanvas.getContext('2d')
    ctx.drawImage(
      canvas,
      0,
      sectionHeight * 2,
      width,
      sectionHeight,
      0,
      0,
      width,
      sectionHeight,
    )
    buffer = regionCanvas.toBuffer('image/png')
    fs.writeFileSync('/tmp/debug_left_bottom.png', buffer)
    console.log('💾 Left bottom section saved: /tmp/debug_left_bottom.png')
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
🔧 Debug Axis Extractor

Usage:
  npm run debug-axis <input-image>

This will save debug images to /tmp/ directory for analysis.
`)
    process.exit(1)
  }

  const inputPath = args[0]
  const extractor = new DebugAxisExtractor()

  extractor
    .debugRegions(inputPath)
    .then(() => {
      console.log('\n🎉 Debug images created! Check /tmp/ directory')
      console.log('📂 Files created:')
      console.log('  - /tmp/debug_original.png')
      console.log('  - /tmp/debug_left_current_*.png')
      console.log('  - /tmp/debug_left_10percent_*.png')
      console.log('  - /tmp/debug_left_20percent_*.png')
      console.log('  - /tmp/debug_left_25percent_*.png')
      console.log('  - /tmp/debug_left_top.png')
      console.log('  - /tmp/debug_left_middle.png')
      console.log('  - /tmp/debug_left_bottom.png')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Debug failed:', error.message)
      process.exit(1)
    })
}
