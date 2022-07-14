import { Position } from '@/types'
import ColorThief from 'colorthief'
const colorThief = new ColorThief()

export class CanvasManager {
  static #instance: CanvasManager
  #canvasWrapper?: HTMLDivElement
  #imageCanvas?: HTMLCanvasElement
  #maskCanvas?: HTMLCanvasElement
  #imageElement?: HTMLImageElement
  #canvasScale = 1
  #cursor: Position = { xPx: 0, yPx: 0 }

  static get instance(): CanvasManager {
    if (!this.#instance) {
      this.#instance = new CanvasManager()
    }
    return this.#instance
  }

  async initialize(
    canvasWrapperId: string,
    imageCanvasId: string,
    maskCanvasId: string,
    graphImagePath: string
  ) {
    this.#canvasWrapper = this.#getDivElementById(canvasWrapperId)
    this.#imageCanvas = this.#getCanvasElementById(imageCanvasId)
    this.#maskCanvas = this.#getCanvasElementById(maskCanvasId)
    this.#imageElement = await this.loadImage(graphImagePath)

    this.drawFitSizeImage()
  }

  #getDivElementById(id: string) {
    return document.getElementById(id) as HTMLDivElement
  }

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

  drawMask(xPx: number, yPx: number, penSize: number) {
    const ctx = this.maskCanvasCtx
    ctx.beginPath()
    if (this.#cursor.xPx === 0) {
      ctx.moveTo(xPx, yPx)
    } else {
      ctx.moveTo(this.#cursor.xPx, this.#cursor.yPx)
    }
    ctx.lineTo(xPx, yPx)
    ctx.lineCap = 'round'
    ctx.lineWidth = penSize
    ctx.stroke()
    ctx.strokeStyle = '#ffff00ff' // INFO: yellow
    this.#cursor = { xPx, yPx }
  }

  resetDrawMaskPos() {
    this.#cursor = { xPx: 0, yPx: 0 }
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
  }

  get originalWidth(): number {
    return this.imageElement.width
  }

  get originalHeight(): number {
    return this.imageElement.height
  }

  get imageIsScaled() {
    return this.canvasScale !== 1
  }

  set canvasScale(canvasScale: number) {
    this.#canvasScale = canvasScale
  }

  get canvasWrapper() {
    if (!this.#canvasWrapper) {
      throw new Error('#canvasWrapper is undefined.')
    }
    return this.#canvasWrapper
  }

  get canvasScale() {
    if (!this.#canvasScale) {
      throw new Error('#canvasScale is undefined.')
    }
    return this.#canvasScale
  }

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
    if (!this.#maskCanvas) {
      throw new Error('#maskCanvas is undefined.')
    }
    return this.#maskCanvas.getContext('2d') as CanvasRenderingContext2D
  }

  get maskCanvasColors() {
    return this.maskCanvasCtx.getImageData(
      0,
      0,
      this.maskCanvas.width,
      this.maskCanvas.height
    ).data
  }

  drawImage() {
    if (this.imageIsScaled) {
      return this.drawFitSizeImage()
    }
    return this.drawOriginalSizeImage()
  }
  drawFitSizeImage() {
    const wrapperWidthPx = this.canvasWrapper.offsetWidth
    const canvasScale = wrapperWidthPx / this.originalWidth
    const wrapperHeightPx = this.originalHeight * canvasScale
    this.resize(wrapperWidthPx, wrapperHeightPx)
    this.canvasScale = canvasScale
  }

  scaleDown() {
    if (this.canvasScale <= 0.1) {
      throw new Error(`The scale doesn't allow it to be a minus.`)
    }
    this.canvasScale = this.canvasScale - 0.1
    const scaledWidth = this.originalWidth * this.canvasScale
    const scaledHeight = this.originalHeight * this.canvasScale
    this.resize(scaledWidth, scaledHeight)
  }

  scaleUp() {
    this.canvasScale = this.canvasScale + 0.1
    const scaledWidth = this.originalWidth * this.canvasScale
    const scaledHeight = this.originalHeight * this.canvasScale
    this.resize(scaledWidth, scaledHeight)
  }

  drawOriginalSizeImage() {
    this.resize(this.originalWidth, this.originalHeight)
    this.canvasScale = 1
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
    this.imageCanvas.width = width
    this.imageCanvas.height = height
    this.imageCanvasCtx.drawImage(this.imageElement, 0, 0, width, height)
  }
}
