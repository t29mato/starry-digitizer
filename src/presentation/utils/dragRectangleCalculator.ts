import { Coord } from '@/@types/types'

// Function that builds an absolute rectangle even when dragging from bottom-right to top-left
export function getRectCoordsFromDragCoords(
  dragStartCoord: Coord,
  dragEndCoord: Coord,
): { topLeftCoord: Coord; bottomRightCoord: Coord } {
  const startX = dragStartCoord.xPx
  const startY = dragStartCoord.yPx
  const endX = dragEndCoord.xPx
  const endY = dragEndCoord.yPx

  return {
    topLeftCoord: {
      xPx: Math.min(startX, endX),
      yPx: Math.min(startY, endY),
    },
    bottomRightCoord: {
      xPx: Math.max(startX, endX),
      yPx: Math.max(startY, endY),
    },
  }
}
