import { Coord } from '@/domain/models/dataset/datasetInterface'

export interface CanvasHandlerInterface {
  isDrawnMask: boolean
  imageElement: HTMLImageElement
  scale: number
  cursor: Coord
  manualMode: number
  maskMode: number
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

  initializeImageElement(imagePath: string): void
  getDivElementById(id: string): HTMLDivElement
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
  clearTempMask(): void
  clearMask(): void
  drawFitSizeImage(): void
  scaleDown(): void
  scaleUp(): void
  drawOriginalSizeImage(): void
  resize(width: number, height: number): void
  setUploadImageUrl(url: string): void
  setCursor(coord: Coord): void
  setManualMode(mode: number): void
  setMaskMode(mode: number): void
  setPenToolSizePx(size: number): void
  setEraserSizePx(size: number): void
}
