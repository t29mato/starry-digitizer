import { Coord } from '@/@types/types'

// INFO: Even-odd rule, used by lasso selection. A polygon with fewer than
// 3 vertices contains nothing.
export function isPointInPolygon(point: Coord, polygon: Coord[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if (
      a.yPx > point.yPx !== b.yPx > point.yPx &&
      point.xPx <
        ((b.xPx - a.xPx) * (point.yPx - a.yPx)) / (b.yPx - a.yPx) + a.xPx
    ) {
      inside = !inside
    }
  }
  return inside
}
