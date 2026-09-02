import { Coord } from '@/@types/types'
import { matchColor } from './colorMatching'
import {
  floodFillBlob,
  centroidOfPixels,
  diameterFromPixelCount,
} from './symbolBlobDetection'

export interface SnapToSymbolOptions {
  /** Min/max accepted blob diameter (px) — same semantics as Symbol Extract's own settings. */
  minDiameterPx: number
  maxDiameterPx: number
  /** How far (px, in original image pixel coordinates) from the click to look for a color-matching pixel to seed the blob search from. */
  searchRadiusPx: number
}

export const DEFAULT_SNAP_SEARCH_RADIUS_PX = 15
const DEFAULT_MIN_DIAMETER_PX = 1
const DEFAULT_MAX_DIAMETER_PX = 100

function isMatchAt(
  x: number,
  y: number,
  width: number,
  height: number,
  imageColors: Uint8ClampedArray,
  targetColor: [number, number, number],
  colorMatchThreshold: number,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return false
  }
  const i = (y * width + x) * 4
  return matchColor(
    [imageColors[i], imageColors[i + 1], imageColors[i + 2]],
    targetColor,
    colorMatchThreshold,
  )
}

/**
 * Finds the color-matching pixel closest to (clickXPx, clickYPx) to grow a
 * blob search from, searching outward ring by ring (Chebyshev distance) up
 * to `searchRadiusPx`. Returns null if none is found within range.
 */
function findSeedPixel(
  clickXPx: number,
  clickYPx: number,
  width: number,
  height: number,
  imageColors: Uint8ClampedArray,
  targetColor: [number, number, number],
  colorMatchThreshold: number,
  searchRadiusPx: number,
): Coord | null {
  const centerX = Math.round(clickXPx)
  const centerY = Math.round(clickYPx)

  const matches = (x: number, y: number) =>
    isMatchAt(
      x,
      y,
      width,
      height,
      imageColors,
      targetColor,
      colorMatchThreshold,
    )

  if (matches(centerX, centerY)) {
    return { xPx: centerX, yPx: centerY }
  }

  // Expand outward ring by ring so the closest matching pixel wins.
  for (let radius = 1; radius <= searchRadiusPx; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Only test the ring's perimeter — interior cells were already
        // tested at smaller radii.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue
        }
        const x = centerX + dx
        const y = centerY + dy
        if (matches(x, y)) {
          return { xPx: x, yPx: y }
        }
      }
    }
  }
  return null
}

/**
 * Finds the centroid of the same-colored symbol/blob nearest to the given
 * click position, reusing Symbol Extract's flood-fill blob detection (see
 * symbolBlobDetection.ts). Used to "snap" a manually-added point onto the
 * nearest plot symbol instead of the raw click pixel.
 *
 * Returns null when no matching blob of an acceptable size is found within
 * range of the click, so callers can fall back to the raw click position.
 */
export function findNearestSymbolCentroid(
  clickXPx: number,
  clickYPx: number,
  width: number,
  height: number,
  imageColors: Uint8ClampedArray,
  targetColor: [number, number, number],
  colorMatchThreshold: number,
  options: Partial<SnapToSymbolOptions> = {},
): Coord | null {
  if (width <= 0 || height <= 0) {
    return null
  }

  const minDiameterPx = options.minDiameterPx ?? DEFAULT_MIN_DIAMETER_PX
  const maxDiameterPx = options.maxDiameterPx ?? DEFAULT_MAX_DIAMETER_PX
  const searchRadiusPx = options.searchRadiusPx ?? DEFAULT_SNAP_SEARCH_RADIUS_PX

  const seed = findSeedPixel(
    clickXPx,
    clickYPx,
    width,
    height,
    imageColors,
    targetColor,
    colorMatchThreshold,
    searchRadiusPx,
  )
  if (!seed) {
    return null
  }

  // Bound the flood fill to a local window around the seed so a large
  // same-colored region (e.g. background matched by a loose color
  // threshold) can't force scanning/growing across the whole image on
  // every click.
  const windowMargin = searchRadiusPx + maxDiameterPx
  const bounds = {
    minX: Math.max(0, seed.xPx - windowMargin),
    minY: Math.max(0, seed.yPx - windowMargin),
    maxXExclusive: Math.min(width, seed.xPx + windowMargin + 1),
    maxYExclusive: Math.min(height, seed.yPx + windowMargin + 1),
  }
  const visitedArea: boolean[][] = [
    ...Array(bounds.maxYExclusive - bounds.minY),
  ].map(() => Array(bounds.maxXExclusive - bounds.minX).fill(false))

  const pixels = floodFillBlob(
    seed.xPx,
    seed.yPx,
    width,
    imageColors,
    targetColor,
    colorMatchThreshold,
    visitedArea,
    bounds,
  )

  const diameter = diameterFromPixelCount(pixels.length)
  if (diameter < minDiameterPx || diameter > maxDiameterPx) {
    return null
  }

  // Match Symbol Extract's own +0.5px offset so a snapped point lines up
  // with points placed by automatic extraction.
  const offsetPx = 0.5
  const centroid = centroidOfPixels(pixels)
  return {
    xPx: parseFloat((centroid.xPx + offsetPx).toFixed(1)),
    yPx: parseFloat((centroid.yPx + offsetPx).toFixed(1)),
  }
}
