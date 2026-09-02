// colorPaletteUtils.ts
// Utility for extracting representative colors (color palette) from image data
// Excludes white/gray tones, groups similar colors, prioritizes saturation, includes black tones

function isWhite(r: number, g: number, b: number): boolean {
  return r > 200 && g > 200 && b > 200
}

// Renamed to a function that returns saturation only
function getSaturation(r: number, g: number, b: number): number {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  }
  return s
}

function colorDiff(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

interface ExtractColorSwatchesOptions {
  imageData: Uint8ClampedArray
  maxSwatches?: number
  colorDiffThreshold?: number
}

function buildColorMap(
  imageData: Uint8ClampedArray,
): Map<string, { count: number; s: number }> {
  const colorMap = new Map<string, { count: number; s: number }>()
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]
    const a = imageData[i + 3]
    if (a < 128) continue
    if (isWhite(r, g, b)) continue
    // Do not exclude gray or black
    const s = getSaturation(r, g, b)
    const hex =
      '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    if (colorMap.has(hex)) {
      colorMap.get(hex)!.count++
    } else {
      colorMap.set(hex, { count: 1, s })
    }
  }
  return colorMap
}

function groupBySimilarColor(
  sorted: [string, { count: number; s: number }][],
  maxSwatches: number,
  colorDiffThreshold: number,
): string[] {
  const groups: { hex: string; s: number; count: number }[] = []
  for (const [hex, { s, count }] of sorted) {
    let found = false
    for (let i = 0; i < groups.length; i++) {
      if (colorDiff(groups[i].hex, hex) < colorDiffThreshold) {
        if (s > groups[i].s) {
          groups[i] = { hex, s, count }
        }
        found = true
        break
      }
    }
    if (!found) {
      groups.push({ hex, s, count })
    }
    if (groups.length >= maxSwatches) break
  }
  return groups.map((g) => g.hex)
}

export function extractColorSwatches({
  imageData,
  maxSwatches = 10,
  colorDiffThreshold = 60,
}: ExtractColorSwatchesOptions): string[] {
  const colorMap = buildColorMap(imageData)
  // Stop prioritizing saturation and sort only by occurrence count
  const sorted = Array.from(colorMap.entries()).sort(
    (a, b) => b[1].count - a[1].count,
  )
  return groupBySimilarColor(sorted, maxSwatches, colorDiffThreshold)
}
