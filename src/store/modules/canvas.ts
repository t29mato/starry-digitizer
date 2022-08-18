import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Canvas } from '@/domains/canvas'
import { Position } from '@/domains/datasetInterface'

class state {
  canvas: Canvas = new Canvas()
}

class getters extends Getters<state> {
  get canvas() {
    return this.state.canvas
  }
}

class actions extends Actions<state, getters> {
  scaleUp() {
    this.state.canvas.scaleUp()
  }

  scaleDown() {
    this.state.canvas.scaleDown()
  }

  resizeCanvasToOriginal() {
    this.state.canvas.drawOriginalSizeImage()
  }

  drawFitSizeImage() {
    this.state.canvas.drawFitSizeImage()
  }

  mouseMoveForPen(config: { xPx: number; yPx: number; penSize: number }) {
    this.state.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
  }

  setCanvasCursor(position: Position) {
    this.state.canvas.cursor = position
  }

  setPenToolSizePx(size: number) {
    this.state.canvas.penToolSizePx = size
  }

  setMaskMode(mode: number) {
    this.state.canvas.maskMode = mode
    this.state.canvas.manualMode = -1
  }

  setManualMode(mode: number) {
    // TODO: この処理はDomainに持たせるべき？
    this.state.canvas.manualMode = mode
    this.state.canvas.maskMode = -1
  }

  setEraserSizePx(size: number) {
    this.state.canvas.eraserSizePx = size
  }

  setUploadImageUrl(url: string) {
    this.state.canvas.uploadImageUrl = url
  }

  mouseMoveOnCanvas(position: Position) {
    this.state.canvas.mouseMove(position.xPx, position.yPx)
  }
}

export const canvas = new Module({
  state,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
