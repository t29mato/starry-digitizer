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

  static getMouseCoordFromMouseEvent(e: MouseEvent): Coord {
    // INFO: to adjust the exact position the user clicked.
    const offsetPx = 1

    // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
    const target = e.target as HTMLElement
    const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
    const yPx = e.offsetY + parseFloat(target.style.top)

    return {
      xPx,
      yPx,
    }
  }
}
