import { Coord } from '@/@types/types'
import { matchColor } from './colorMatching'

/**
 * Rectangular region (in image-pixel coordinates) a blob search is allowed
 * to grow within. `maxXExclusive`/`maxYExclusive` are exclusive upper
 * bounds, so the region is [minX, maxXExclusive) x [minY, maxYExclusive).
 */
export interface BlobSearchBounds {
  minX: number
  minY: number
  maxXExclusive: number
  maxYExclusive: number
}

/**
 * Flood-fills the connected blob of color-matching pixels reachable from
 * (seedXPx, seedYPx) via 8-directional adjacency, constrained to `bounds`.
 * Mutates `visitedArea` (sized to `bounds`, i.e. `visitedArea[y - bounds.minY][x - bounds.minX]`)
 * to mark every pixel included in the returned blob.
 *
 * This is the connected-component search Symbol Extract uses to find
 * plot-symbol blobs across the whole image (see symbolExtractByArea.ts).
 * It's extracted here so the "snap to symbol" manual point-placement
 * helper (symbolSnapping.ts) can reuse the exact same algorithm on a small
 * local region around a click instead of re-implementing it.
 */
export function floodFillBlob(
  seedXPx: number,
  seedYPx: number,
  imageWidth: number,
  imageColors: Uint8ClampedArray,
  targetColor: [number, number, number],
  colorMatchThreshold: number,
  visitedArea: boolean[][],
  bounds: BlobSearchBounds,
): Coord[] {
  const pixels: Coord[] = [{ xPx: seedXPx, yPx: seedYPx }]
  visitedArea[seedYPx - bounds.minY][seedXPx - bounds.minX] = true

  let pixelsIndex = 0
  while (pixelsIndex < pixels.length) {
    const { xPx, yPx } = pixels[pixelsIndex]
    // nh = next height (y), nw = next width (x)
    for (let nh = yPx - 1; nh <= yPx + 1; nh++) {
      for (let nw = xPx - 1; nw <= xPx + 1; nw++) {
        if (
          nh < bounds.minY ||
          nw < bounds.minX ||
          nh >= bounds.maxYExclusive ||
          nw >= bounds.maxXExclusive
        ) {
          continue
        }
        const visitedRow = visitedArea[nh - bounds.minY]
        if (visitedRow[nw - bounds.minX]) {
          continue
        }
        const i = (nh * imageWidth + nw) * 4
        const isMatch = matchColor(
          [imageColors[i], imageColors[i + 1], imageColors[i + 2]],
          targetColor,
          colorMatchThreshold,
        )
        if (isMatch) {
          pixels.push({ xPx: nw, yPx: nh })
          visitedRow[nw - bounds.minX] = true
        }
      }
    }
    pixelsIndex++
  }
  return pixels
}

/** Pixel-count-weighted centroid of a blob's pixels, in image-pixel coordinates. */
export function centroidOfPixels(pixels: Coord[]): Coord {
  const xPxTotal = pixels.reduce((sum, p) => sum + p.xPx, 0)
  const yPxTotal = pixels.reduce((sum, p) => sum + p.yPx, 0)
  return {
    xPx: xPxTotal / pixels.length,
    yPx: yPxTotal / pixels.length,
  }
}

/** Diameter (px) of a circle with the same area as `pixelCount` pixels. */
export function diameterFromPixelCount(pixelCount: number): number {
  // area = πr^2 => r = √(area / π) => diameter = r * 2
  return Math.sqrt(pixelCount / Math.PI) * 2
}
