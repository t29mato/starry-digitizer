import { ManualMode, MaskMode } from '@/@types/types'
import { Coord } from '@/@types/types'
import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'
import { PixelSource } from '@/application/ports/pixelSource'

// INFO: the DOM elements the presentation layer lends to the engine. Every
// key is optional because the wrapper/main canvases and the magnifier mask
// canvas are owned by two different components that mount independently.
export type AttachedCanvasElements = {
  wrapper?: HTMLDivElement
  imageCanvas?: HTMLCanvasElement
  maskCanvas?: HTMLCanvasElement
  tempMaskCanvas?: HTMLCanvasElement
  magnifierMaskCanvas?: HTMLCanvasElement
}

export interface CanvasHandlerInterface extends PixelSource {
  isDrawnMask: boolean
  imageElement: HTMLImageElement
  scale: number
  cursor: Coord
  isCursorOnCanvas: boolean
  manualMode: ManualMode
  maskMode: MaskMode
  rectangle: {
    startX: number
    startY: number
    endX: number
    endY: number
  }
  originalWidth: number
  originalHeight: number
  uploadImageUrl: string
  penToolSizePx: number
  eraserSizePx: number
  get originalSizeMaskCanvasColors(): Uint8ClampedArray
  get originalImageCanvasColors(): Uint8ClampedArray
  get colorSwatches(): string[]
  get isDrawingMask(): boolean
  get scaledCursor(): Coord
  get hasImage(): boolean
  get hasCanvases(): boolean
  get canvasWrapper(): HTMLDivElement
  get imageCanvas(): HTMLCanvas
  get maskCanvas(): HTMLCanvas
  get tempMaskCanvas(): HTMLCanvas
  get magnifierMaskCanvas(): HTMLCanvas

  initializeImageElement(imagePath: string): Promise<unknown>
  attachCanvases(elements: AttachedCanvasElements): void
  detachCanvases(keys?: (keyof AttachedCanvasElements)[]): void
  mouseDown(xPx: number, yPx: number): void
  mouseDragInManualMode(): void
  mouseDragInMaskMode(xPx: number, yPx: number): void
  mouseDrag(xPx: number, yPx: number): void
  mouseUp(): void
  drawDraggedArea(): void
  drawPenMask(xPx: number, yPx: number, penSize: number): void
  drawEraserMask(xPx: number, yPx: number, penSize: number): void
  drawBoxMask(): void
  clearRectangle(): void
  changeImage(imageElement: HTMLImageElement): void
  clearImage(): void
  clearTempMask(): void
  clearMask(): void
  drawFitSizeImage(): void
  scaleDown(): void
  scaleUp(): void
  drawOriginalSizeImage(): void
  resize(width: number, height: number): void
  setUploadImageUrl(url: string): void
  setCursor(coord: Coord): void
  setIsCursorOnCanvas(value: boolean): void
  setManualMode(mode: ManualMode): void
  setMaskMode(mode: MaskMode): void
  // INFO: "the user deselected the active mask tool" — unlike
  // setMaskMode(UNSET) it restores the manual mode that was on before the mask
  // tool was switched on.
  exitMaskMode(): void
  setPenToolSizePx(size: number): void
  setEraserSizePx(size: number): void
}
