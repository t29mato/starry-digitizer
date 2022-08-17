import { Position } from '@/types'
import ColorThief from 'colorthief'
import { CanvasInterface } from './canvasInterface'
import { HTMLCanvas } from './dom/HTMLCanvas'
const colorThief = new ColorThief()

export class Canvas implements CanvasInterface {
  static #instance: Canvas
  isDrawnMask = false
  #imageElement?: HTMLImageElement
  scale = 1
  cursor: Position = { xPx: 0, yPx: 0 }
  #rectangle = {
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

  static get instance(): Canvas {
    if (!this.#instance) {
      this.#instance = new Canvas()
    }
    return this.#instance
  }

  async initialize(graphImagePath: string) {
    this.#imageElement = await this.loadImage(graphImagePath)
  }

  #getDivElementById(id: string): HTMLDivElement {
    const element = document.getElementById(id)
    if (element instanceof HTMLDivElement) {
      return element as HTMLDivElement
    }
    throw new Error(`element ID ${id} is not instance of a HTMLDivElement`)
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (error) => reject(error)
      img.src = src
    })
  }

  get scaledCursor(): Position {
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

  mouseMove(xPx: number, yPx: number) {
    switch (this.maskMode) {
      case 0: // INFO: pen mask
        this.mouseMoveForPen(xPx, yPx, this.penToolSizePx)
        break
      case 1: // INFO: box mask
        this.mouseMoveForBox(xPx, yPx)
        break
      case 2: // INFO: eraser mask
        this.mouseMoveForEraser(xPx, yPx, this.eraserSizePx)
        break
      default:
        break
    }
  }

  mouseMoveForPen(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.strokeStyle = '#ffff00ff' // INFO: yellow
    ctx.beginPath()
    if (this.cursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      ctx.moveTo(this.scaledCursor.xPx, this.scaledCursor.yPx)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    this.isDrawnMask = true
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
  }

  mouseMoveForEraser(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvas.context
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = '#000000' // INFO: black
    ctx.beginPath()
    if (this.scaledCursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      ctx.moveTo(this.scaledCursor.xPx, this.scaledCursor.yPx)
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
      this.maskCanvas.element.height
    )
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
  }

  mouseDownForBox(xPx: number, yPx: number) {
    this.#rectangle.startY = yPx
    this.#rectangle.startX = xPx
  }

  mouseMoveForBox(xPx: number, yPx: number) {
    this.tempMaskCanvas.context.strokeStyle = '#000000ff' // INFO: black
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height
    )
    this.#rectangle.endY = yPx - this.#rectangle.startY
    this.#rectangle.endX = xPx - this.#rectangle.startX
    this.tempMaskCanvas.context.strokeRect(
      this.#rectangle.startX,
      this.#rectangle.startY,
      this.#rectangle.endX,
      this.#rectangle.endY
    )
  }

  mouseUpForBox() {
    this.maskCanvas.context.fillStyle = '#ffff00ff' // INFO: yellow
    this.maskCanvas.context.fillRect(
      this.#rectangle.startX,
      this.#rectangle.startY,
      this.#rectangle.endX,
      this.#rectangle.endY
    )
    this.magnifierMaskCanvas.context.drawImage(this.maskCanvas.element, 0, 0)
    this.isDrawnMask = true
    this.clearRectangle()
    this.tempMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height
    )
  }

  clearRectangle() {
    this.#rectangle = {
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
      this.originalHeight
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
      this.originalHeight
    )
    return ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data
  }

  get colorSwatches() {
    if (!this.#imageElement) {
      throw new Error('#imageElement is undefined.')
    }
    return colorThief.getPalette(this.#imageElement).map((color) => {
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
    this.#imageElement = imageElement
    this.drawFitSizeImage()
  }

  clearMask() {
    this.maskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height
    )
    this.magnifierMaskCanvas.context.clearRect(
      0,
      0,
      this.maskCanvas.element.width,
      this.maskCanvas.element.height
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
    return this.#getDivElementById('canvasWrapper')
  }

  get imageElement() {
    if (!this.#imageElement) {
      throw new Error('#imageElement is undefined.')
    }
    return this.#imageElement
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
      '2d'
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
      height
    )
  }
}
