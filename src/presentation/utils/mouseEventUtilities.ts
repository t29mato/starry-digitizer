import { Coord } from '@/@types/types'

// INFO: マウスイベントから画像キャンバス(#imageCanvas)基準の座標を返す。
// クリック対象がcanvas-point等の子要素でも、clientX/YとgetBoundingClientRect()から
// 算出するため、イベントターゲットに依存せず常に同じ計算式になる
export function getMouseCoordFromMouseEvent(e: MouseEvent): Coord {
  const imageCanvas = document.getElementById('imageCanvas')

  if (!imageCanvas) {
    return {
      xPx: e.offsetX,
      yPx: e.offsetY,
    }
  }

  const rect = imageCanvas.getBoundingClientRect()

  return {
    xPx: e.clientX - rect.left,
    yPx: e.clientY - rect.top,
  }
}
