import { extractColorSwatches } from './colorPaletteUtils'

describe('extractColorSwatches', () => {
  function createImageData(pixels: number[][]): Uint8ClampedArray {
    // pixels: [[r,g,b,a], ...]
    return new Uint8ClampedArray(pixels.flat())
  }

  it('returns empty array for all white', () => {
    const data = createImageData([
      [255, 255, 255, 255], [255, 255, 255, 255],
      [255, 255, 255, 255], [255, 255, 255, 255],
    ])
    expect(extractColorSwatches({ imageData: data, maxSwatches: 5 })).toEqual([])
  })

  it('returns empty array for all gray', () => {
    const data = createImageData([
      [120, 120, 120, 255], [125, 125, 125, 255],
      [130, 130, 130, 255], [128, 128, 128, 255],
    ])
    // グレーは近い色として1色にまとめられる
    expect(extractColorSwatches({ imageData: data, maxSwatches: 5 })).toEqual([
      '#787878',
    ])
  })

  it('returns black for all black', () => {
    const data = createImageData([
      [0, 0, 0, 255], [0, 0, 0, 255],
      [0, 0, 0, 255], [0, 0, 0, 255],
    ])
    expect(extractColorSwatches({ imageData: data, maxSwatches: 5 })).toEqual(['#000000'])
  })

  it('returns main colors, ignoring white/gray', () => {
    const data = createImageData([
      [255, 0, 0, 255],   // red
      [0, 255, 0, 255],   // green
      [0, 0, 255, 255],   // blue
      [255, 255, 255, 255], // white (ignored)
      [128, 128, 128, 255], // gray (含める)
      [0, 0, 0, 255],     // black
    ])
    const result = extractColorSwatches({ imageData: data, maxSwatches: 6, colorDiffThreshold: 10 })
    expect(result).toContain('#ff0000')
    expect(result).toContain('#00ff00')
    expect(result).toContain('#0000ff')
    expect(result).toContain('#000000')
    expect(result).toContain('#808080')
    expect(result).not.toContain('#ffffff')
  })

  it('groups similar colors and picks the most saturated', () => {
    // 2 reds, one more saturated
    const data = createImageData([
      [250, 10, 10, 255], // vivid red
      [200, 30, 30, 255], // duller red
      [0, 255, 0, 255],   // green
      [0, 0, 0, 255],     // black
    ])
    const result = extractColorSwatches({ imageData: data, maxSwatches: 5, colorDiffThreshold: 60 })
    // Only the more saturated red should be present
    expect(result).toContain('#fa0a0a')
    expect(result).not.toContain('#c81e1e')
    expect(result).toContain('#00ff00')
    expect(result).toContain('#000000')
  })

  it('ignores transparent pixels', () => {
    const data = createImageData([
      [255, 0, 0, 255],   // red
      [0, 255, 0, 0],     // green, fully transparent
      [0, 0, 255, 127],   // blue, semi-transparent (should be ignored)
      [0, 0, 0, 255],     // black
    ])
    const result = extractColorSwatches({ imageData: data, maxSwatches: 5 })
    expect(result).toContain('#ff0000')
    expect(result).toContain('#000000')
    expect(result).not.toContain('#00ff00')
    expect(result).not.toContain('#0000ff')
  })
})
