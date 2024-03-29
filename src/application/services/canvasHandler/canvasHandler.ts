//TODO: Separate into multiple apps based on feature (so far, multiple features related to canvas are gethered at this class but it is not ideal)
import ColorThief from 'colorthief'
import { CanvasHandlerInterface } from './canvasHandlerInterface'
import { Coord } from '../../../domain/models/dataset/datasetInterface'
import { HTMLCanvas } from '../../../presentation/dom/HTMLCanvas'
const colorThief = new ColorThief()

export class CanvasHandler implements CanvasHandlerInterface {
  isDrawnMask = false
  imageElement: HTMLImageElement
  scale = 1
  cursor: Coord = { xPx: 0, yPx: 0 }
  rectangle = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  }
  maskMode = -1
  manualMode = -1 // INFO: {0: add, 1: Edit, 2: Delete}
  penToolSizePx = 50
  eraserSizePx = 30
  uploadImageUrl = ''

  constructor() {
    this.imageElement = new Image()
  }

  async initializeImageElement(imagePath: string) {
    return new Promise((resolve, reject) => {
      this.imageElement.onload = resolve
      this.imageElement.onerror = (error) => {
        reject(error)
      }
      this.imageElement.src = imagePath
    })
  }

  getDivElementById(id: string): HTMLDivElement {
    const element = document.getElementById(id)
    if (element instanceof HTMLDivElement) {
      return element as HTMLDivElement
    }
    throw new Error(`element ID ${id} is not instance of a HTMLDivElement`)
  }

  get scaledCursor(): Coord {
    return {
      xPx: this.cursor.xPx * this.scale,
      yPx: this.cursor.yPx * this.scale,
    }
  }

  get scaledPenToolSizePx(): number {
    return this.penToolSizePx * this.scale
  }

  get isDrawingMask(): boolean {
    switch (this.maskMode) {
      case 0:
      case 1:
      case 2:
        return true
      default:
        return false
    }
  }

  mouseDown(xPx: number, yPx: number) {
    this.rectangle.startX = xPx
    this.rectangle.startY = yPx
  }

  mouseDragInManualMode() {
    if (this.manualMode === 1) {
      //INFO: only in EDIT mode
      this.drawDraggedArea()
    }
  }

  mouseDragInMaskMode(xPx: number, yPx: number) {
    switch (this.maskMode) {
      case 0:
        this.drawPenMask(xPx, yPx, this.penToolSizePx)
        break
      case 1: // INFO: マウスドラッグ中は選択範囲を仮描画
        this.drawDraggedArea()
        break
      case 2:
        this.drawEraserMask(xPx, yPx, this.eraserSizePx)
        break
      default:
        break
    }
  }

  mouseDrag(xPx: number, yPx: number) {
    this.rectangle.endX = xPx
    this.rectangle.endY = yPx

    //INFO: 現在のモードがmanual modeかmask modeかで処理を分岐
    if (this.manualMode !== -1) {
      this.mouseDragInManualMode()
      return
    }

    if (this.maskMode !== -1) {
      this.mouseDragInMaskMode(xPx, yPx)
      return
    }
  }

  mouseUp() {
    this.clearTempMask()

    if (this.maskMode === 1) {
      this.drawBoxMask()
    }
  }

  drawDraggedArea() {
    this.tempMaskCanvas.context.strokeStyle = '#000000ff' // INFO: black
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.tempMaskCanvas.context.strokeRect(
      this.rectangle.startX,
      this.rectangle.startY,
      this.rectangle.endX - this.rectangle.startX,
      this.rectangle.endY - this.rectangle.startY,
    )
  }

  drawPenMask(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.strokeStyle = '#ffff00ff' // INFO: yellow
    ctx.beginPath()
    if (this.cursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      // HACK: Firefox v107.0, Google Chrome v108.0.5359.124では問題ないが、
      // HACK: Safari v15.3でなんらか数値計算をしない限り線が描画されないため対応
      ctx.moveTo(this.scaledCursor.xPx + 0.0001, this.scaledCursor.yPx + 0.0001)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    this.isDrawnMask = true
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
  }

  drawEraserMask(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000' // INFO: black
    ctx.beginPath()
    if (this.scaledCursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      // HACK: Firefox v107.0, Google Chrome v108.0.5359.124では問題ないが、
      // HACK: Safari v15.3でなんらか数値計算をしない限り線が描画されないため対応
      // HACK: Edgeでも116.0.1938.69でも同様に描画されなかった
      ctx.moveTo(this.scaledCursor.xPx + 0.0001, this.scaledCursor.yPx + 0.0001)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    this.isDrawnMask = true
    ctx.globalCompositeOperation = 'source-over'
    this.magnifierMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
  }

  drawBoxMask() {
    this.maskCanvas.context.fillStyle = '#ffff00ff' // INFO: yellow
    this.maskCanvas.context.fillRect(
      this.rectangle.startX,
      this.rectangle.startY,
      this.rectangle.endX - this.rectangle.startX,
      this.rectangle.endY - this.rectangle.startY,
    )
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
    this.isDrawnMask = true
    this.clearRectangle()
  }

  clearRectangle() {
    this.rectangle = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    }
  }

  get originalImageCanvasColors() {
    const newCanvas = document.createElement('canvas')
    newCanvas.setAttribute('width', String(this.originalWidth))
    newCanvas.setAttribute('height', String(this.originalHeight))
    const ctx = newCanvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      this.imageElement,
      0,
      0,
      this.originalWidth,
      this.originalHeight,
    )
    return ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data
  }

  get originalSizeMaskCanvasColors() {
    const newCanvas = document.createElement('canvas')
    newCanvas.setAttribute('width', String(this.originalWidth))
    newCanvas.setAttribute('height', String(this.originalHeight))
    const ctx = newCanvas.getContext('2d') as CanvasRenderingContext2D
    ctx.drawImage(
      this.maskCanvas.element,
      0,
      0,
      this.originalWidth,
      this.originalHeight,
    )
    return ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data
  }

  get colorSwatches() {
    if (!this.imageElement) {
      throw new Error('imageElement is undefined.')
    }
    return colorThief.getPalette(this.imageElement).map((color) => {
      // INFO: rgbからhexへの切り替え
      return color.reduce((prev, cur) => {
        // INFO: HEXは各色16進数2桁なので
        if (cur.toString(16).length === 1) {
          return prev + '0' + cur.toString(16)
        }
        return prev + cur.toString(16)
      }, '#')
    })
  }

  changeImage(imageElement: HTMLImageElement) {
    this.imageElement = imageElement
    this.drawFitSizeImage()
  }

  clearTempMask() {
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
  }

  clearMask() {
    this.maskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.magnifierMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height,
    )
    this.isDrawnMask = false
  }

  get originalWidth(): number {
    return this.imageElement.width
  }

  get originalHeight(): number {
    return this.imageElement.height
  }

  get canvasWrapper() {
    return this.getDivElementById('canvasWrapper')
  }

  get imageCanvas() {
    return new HTMLCanvas('imageCanvas')
  }

  get maskCanvas() {
    return new HTMLCanvas('maskCanvas')
  }

  get tempMaskCanvas() {
    return new HTMLCanvas('tempMaskCanvas')
  }

  get magnifierMaskCanvas() {
    return new HTMLCanvas('magnifierMaskCanvas')
  }

  drawFitSizeImage() {
    const wrapperWidthPx = this.canvasWrapper.offsetWidth
    const scale = wrapperWidthPx / this.originalWidth
    const wrapperHeightPx = this.originalHeight * scale
    this.resize(wrapperWidthPx, wrapperHeightPx)
    this.scale = scale
  }

  scaleDown() {
    if (this.scale <= 0.1) {
      throw new Error(`The scale doesn't allow it to be a minus.`)
    }
    this.scale = this.scale - 0.1
    const scaledWidth = this.originalWidth * this.scale
    const scaledHeight = this.originalHeight * this.scale
    this.resize(scaledWidth, scaledHeight)
  }

  scaleUp() {
    this.scale = this.scale + 0.1
    const scaledWidth = this.originalWidth * this.scale
    const scaledHeight = this.originalHeight * this.scale
    this.resize(scaledWidth, scaledHeight)
  }

  drawOriginalSizeImage() {
    this.resize(this.originalWidth, this.originalHeight)
    this.scale = 1
  }

  resize(width: number, height: number) {
    const tempMaskCanvas = document.createElement('canvas')
    const tempMaskCanvasCtx = tempMaskCanvas.getContext(
      '2d',
    ) as CanvasRenderingContext2D
    tempMaskCanvas.width = this.maskCanvas.element.width
    tempMaskCanvas.height = this.maskCanvas.element.height
    tempMaskCanvasCtx.drawImage(this.maskCanvas.element, 0, 0)
    this.maskCanvas.element.width = width
    this.maskCanvas.element.height = height
    this.maskCanvas.context.drawImage(tempMaskCanvas, 0, 0, width, height)
    this.tempMaskCanvas.element.width = width
    this.tempMaskCanvas.element.height = height
    this.imageCanvas.element.width = width
    this.imageCanvas.element.height = height
    this.imageCanvas.context.drawImage(this.imageElement, 0, 0, width, height)
    this.magnifierMaskCanvas.element.width = width
    this.magnifierMaskCanvas.element.height = height
    this.magnifierMaskCanvas.context.drawImage(
      this.maskCanvas.element,
      0,
      0,
      width,
      height,
    )
  }

  setUploadImageUrl(url: string) {
    this.uploadImageUrl = url
  }

  setCursor(coord: Coord) {
    this.cursor = coord
  }

  setManualMode(mode: number) {
    this.manualMode = mode
    this.maskMode = -1
  }

  setMaskMode(mode: number) {
    this.maskMode = mode
    this.manualMode = -1
  }

  setPenToolSizePx(size: number) {
    this.penToolSizePx = size
  }

  setEraserSizePx(size: number) {
    this.eraserSizePx = size
  }
}
