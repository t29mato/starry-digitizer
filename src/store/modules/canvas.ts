import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
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

class mutations extends Mutations<state> {
  updateCanvas(newCanvas: Canvas) {
    this.state.canvas = newCanvas
  }
}

class actions extends Actions<state, getters, mutations> {
  scaleUp() {
    this.state.canvas.scaleUp()
    this.commit('updateCanvas', this.state.canvas)
  }

  scaleDown() {
    this.state.canvas.scaleDown()
    this.commit('updateCanvas', this.state.canvas)
  }

  resizeCanvasToOriginal() {
    this.state.canvas.drawOriginalSizeImage()
    this.commit('updateCanvas', this.state.canvas)
  }

  drawFitSizeImage() {
    this.state.canvas.drawFitSizeImage()
    this.commit('updateCanvas', this.state.canvas)
  }

  mouseMoveForPen(config: { xPx: number; yPx: number; penSize: number }) {
    this.state.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
    this.commit('updateCanvas', this.state.canvas)
  }

  setCanvasCursor(position: Position) {
    this.state.canvas.cursor = position
    this.commit('updateCanvas', this.state.canvas)
  }

  setPenToolSizePx(size: number) {
    this.state.canvas.penToolSizePx = size
    this.commit('updateCanvas', this.state.canvas)
  }

  setMaskMode(mode: number) {
    this.state.canvas.maskMode = mode
    this.state.canvas.manualMode = -1
    this.commit('updateCanvas', this.state.canvas)
  }

  setManualMode(mode: number) {
    // TODO: この処理はDomainに持たせるべき？
    this.state.canvas.manualMode = mode
    this.state.canvas.maskMode = -1
    this.commit('updateCanvas', this.state.canvas)
  }

  setEraserSizePx(size: number) {
    this.state.canvas.eraserSizePx = size
    this.commit('updateCanvas', this.state.canvas)
  }

  setUploadImageUrl(url: string) {
    this.state.canvas.uploadImageUrl = url
    this.commit('updateCanvas', this.state.canvas)
  }

  mouseMoveOnCanvas(position: Position) {
    this.state.canvas.mouseMove(position.xPx, position.yPx)
    this.commit('updateCanvas', this.state.canvas)
  }
}

export const canvas = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
