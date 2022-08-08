import { Position } from '@/types'
import ColorThief from 'colorthief'
import XYAxesCalculator from './XYAxesCalculator'
const colorThief = new ColorThief()

export class Canvas {
  static #instance: Canvas
  #canvasWrapper?: HTMLDivElement
  #imageCanvas?: HTMLCanvasElement
  #maskCanvas?: HTMLCanvasElement
  #magnifierMaskCanvas?: HTMLCanvasElement
  isDrawnMask = false
  #tempMaskCanvas?: HTMLCanvasElement
  #imageElement?: HTMLImageElement
  scale = 1
  cursor: Position = { xPx: 0, yPx: 0 }
  #rectangle = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  }
  plotSizePx = 10
  maskMode = -1
  penToolSizePx = 50
  eraserSizePx = 30

  static get instance(): Canvas {
    if (!this.#instance) {
      this.#instance = new Canvas()
    }
    return this.#instance
  }

  async initialize(
    canvasWrapperId: string,
    imageCanvasId: string,
    maskCanvasId: string,
    tempMaskCanvasId: string,
    magnifierMaskCanvasId: string,
    graphImagePath: string
  ) {
    this.#canvasWrapper = this.#getDivElementById(canvasWrapperId)
    this.#imageCanvas = this.#getCanvasElementById(imageCanvasId)
    this.#maskCanvas = this.#getCanvasElementById(maskCanvasId)
    this.#tempMaskCanvas = this.#getCanvasElementById(tempMaskCanvasId)
    this.#magnifierMaskCanvas = this.#getCanvasElementById(
      magnifierMaskCanvasId
    )
    this.#imageElement = await this.loadImage(graphImagePath)
  }

  #getDivElementById(id: string) {
    return document.getElementById(id) as HTMLDivElement
  }

  // TODO: TypeがHTMLCanvasElementでなければここでエラー出す。
  #getCanvasElementById(id: string) {
    return document.getElementById(id) as HTMLCanvasElement
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

  // FIXME: このsetterいる？
  set CanvasCursor(position: Position) {
    this.cursor = position
  }

  // set PenToolSizePx(size: number) {
  //   this.penToolSizePx = size
  // }

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
    const ctx = this.maskCanvasCtx
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
    this.magnifierMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0)
  }

  mouseMoveForEraser(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvasCtx
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
    this.magnifierMaskCanvasCtx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    )
    this.magnifierMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0)
  }

  mouseDownForBox(xPx: number, yPx: number) {
    this.#rectangle.startY = yPx
    this.#rectangle.startX = xPx
  }

  mouseMoveForBox(xPx: number, yPx: number) {
    this.tempMaskCanvasCtx.strokeStyle = '#000000ff' // INFO: black
    this.tempMaskCanvasCtx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    )
    this.#rectangle.endY = yPx - this.#rectangle.startY
    this.#rectangle.endX = xPx - this.#rectangle.startX
    this.tempMaskCanvasCtx.strokeRect(
      this.#rectangle.startX,
      this.#rectangle.startY,
      this.#rectangle.endX,
      this.#rectangle.endY
    )
  }

  mouseUpForBox() {
    this.maskCanvasCtx.fillStyle = '#ffff00ff' // INFO: yellow
    this.maskCanvasCtx.fillRect(
      this.#rectangle.startX,
      this.#rectangle.startY,
      this.#rectangle.endX,
      this.#rectangle.endY
    )
    this.magnifierMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0)
    this.isDrawnMask = true
    this.clearRectangle()
    this.tempMaskCanvasCtx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
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

  // resetDrawMaskPos() {
  //   this.cursor = { xPx: 0, yPx: 0 }
  // }

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
      this.maskCanvas,
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
    this.maskCanvasCtx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    )
    this.magnifierMaskCanvasCtx.clearRect(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    )
    this.isDrawnMask = false
  }

  get originalWidth(): number {
    return this.imageElement.width
  }

  get originalHeight(): number {
    return this.imageElement.height
  }

  // set scale(scale: number) {
  //   this.#scale = scale
  // }

  get canvasWrapper() {
    if (!this.#canvasWrapper) {
      throw new Error('#canvasWrapper is undefined.')
    }
    return this.#canvasWrapper
  }

  // get scale() {
  //   if (!this.#scale) {
  //     throw new Error('#scale is undefined.')
  //   }
  //   return this.#scale
  // }

  get imageElement() {
    if (!this.#imageElement) {
      throw new Error('#imageElement is undefined.')
    }
    return this.#imageElement
  }

  get imageCanvas() {
    if (!this.#imageCanvas) {
      throw new Error('#imageCanvas is undefined.')
    }
    return this.#imageCanvas
  }

  get imageCanvasCtx() {
    if (!this.#imageCanvas) {
      throw new Error('#imageCanvas is undefined.')
    }
    return this.#imageCanvas.getContext('2d') as CanvasRenderingContext2D
  }

  get imageCanvasColors() {
    return this.imageCanvasCtx.getImageData(
      0,
      0,
      this.originalWidth,
      this.originalHeight
    ).data
  }

  get maskCanvas() {
    if (!this.#maskCanvas) {
      throw new Error('#maskCanvas is undefined.')
    }
    return this.#maskCanvas
  }

  get maskCanvasCtx() {
    return this.maskCanvas.getContext('2d') as CanvasRenderingContext2D
  }

  get maskCanvasColors() {
    return this.maskCanvasCtx.getImageData(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    ).data
  }

  get tempMaskCanvas() {
    if (!this.#tempMaskCanvas) {
      throw new Error('#tempMaskCanvas is undefined.')
    }
    return this.#tempMaskCanvas
  }

  get tempMaskCanvasCtx() {
    return this.tempMaskCanvas.getContext('2d') as CanvasRenderingContext2D
  }

  get magnifierMaskCanvas() {
    if (!this.#magnifierMaskCanvas) {
      throw new Error('#magnifierMaskCanvas is undefined.')
    }
    return this.#magnifierMaskCanvas
  }

  get magnifierMaskCanvasCtx() {
    return this.magnifierMaskCanvas.getContext('2d') as CanvasRenderingContext2D
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
    tempMaskCanvas.width = this.maskCanvas.width
    tempMaskCanvas.height = this.maskCanvas.height
    tempMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0)
    this.maskCanvas.width = width
    this.maskCanvas.height = height
    this.maskCanvasCtx.drawImage(tempMaskCanvas, 0, 0, width, height)
    this.tempMaskCanvas.width = width
    this.tempMaskCanvas.height = height
    this.imageCanvas.width = width
    this.imageCanvas.height = height
    this.imageCanvasCtx.drawImage(this.imageElement, 0, 0, width, height)
    this.magnifierMaskCanvas.width = width
    this.magnifierMaskCanvas.height = height
    this.magnifierMaskCanvasCtx.drawImage(this.maskCanvas, 0, 0, width, height)
  }
}
