import { Coord } from '@/@types/types'

// INFO: Returns coordinates relative to the image canvas (#imageCanvas) from a mouse event.
// Even when the click target is a child element such as canvas-point, the coordinates are
// calculated from clientX/Y and getBoundingClientRect(), so the same formula is always used
// regardless of the event target.
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
