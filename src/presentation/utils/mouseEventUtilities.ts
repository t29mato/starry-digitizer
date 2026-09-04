import { Coord } from '@/@types/types'

// INFO: マウスイベントから画像キャンバス基準の座標を返す。
// クリック対象がcanvas-point等の子要素でも、clientX/YとgetBoundingClientRect()から
// 算出するため、イベントターゲットに依存せず常に同じ計算式になる。
// INFO: the canvas element is passed in rather than looked up by id — several
// <StarryDigitizer> instances can share a page, so an id lookup would always
// find the first one.
export function getMouseCoordFromMouseEvent(
  e: MouseEvent,
  imageCanvas: HTMLCanvasElement | undefined,
): Coord {
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
