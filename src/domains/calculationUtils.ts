import { Coord } from './datasetInterface'

export default class calculationUtils {
  static getRectCoordsFromDragCoords(
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
}
