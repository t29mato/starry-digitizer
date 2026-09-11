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
  // INFO: true when drawFitSizeImage() was called while the canvas frame had
  // no layout yet (a host may let flex size it, so the image can arrive before
  // the frame has a height) and the fit is therefore still owed.
  // attachCanvases() observes the wrapper and re-runs drawFitSizeImage() when
  // it gets a size. A host reads it to know the scale is not final yet.
  get hasPendingFitSize(): boolean
  // Whether the current scale IS a fit (as opposed to a zoom the user picked
  // with scaleUp / scaleDown / drawOriginalSizeImage). The wrapper observer
  // re-fits while this is true, so a frame that changes size after a
  // successful fit — a split view opening, the window narrowing — follows it
  // instead of leaving the figure clipped at the old scale. A manual zoom
  // leaves fit mode and is never overridden.
  get isFittedToFrame(): boolean
  get canvasWrapper(): HTMLDivElement
  get imageCanvas(): HTMLCanvas
  get maskCanvas(): HTMLCanvas
  get tempMaskCanvas(): HTMLCanvas
  get magnifierMaskCanvas(): HTMLCanvas

  initializeImageElement(imagePath: string): Promise<unknown>
  // INFO: ONE set of canvases per context — one <CanvasMain>. Mounting a
  // second one against the same context makes the first stop drawing (its
  // attach wins), which is why this warns when it replaces an element that
  // was already attached.
  attachCanvases(elements: AttachedCanvasElements): void
  // Give elements back. An unmounting component passes THE ELEMENTS it
  // attached, so only the slots it still owns are cleared; the key form (and
  // no argument at all) detaches unconditionally, for a full teardown.
  detachCanvases(
    target?: (keyof AttachedCanvasElements)[] | AttachedCanvasElements,
  ): void
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
  // INFO: whether scaleDown() would still change the scale — false once the
  // lower zoom bound is reached, where scaleDown() is a no-op. A host drawing
  // its own zoom-out button binds this to `:disabled` so the button matches
  // what pressing it would do.
  get canScaleDown(): boolean
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
