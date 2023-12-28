import { Coord } from '@/domains/datasetInterface'

// Canvas上のpositionを返す関数
export function getMouseCoordFromMouseEvent(e: MouseEvent): Coord {
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
