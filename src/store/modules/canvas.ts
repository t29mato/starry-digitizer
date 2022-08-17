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
  canvas: Canvas = Canvas.instance
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
    Canvas.instance.scaleUp()
    this.commit('updateCanvas', Canvas.instance)
  }

  scaleDown() {
    Canvas.instance.scaleDown()
    this.commit('updateCanvas', Canvas.instance)
  }

  resizeCanvasToOriginal() {
    Canvas.instance.drawOriginalSizeImage()
    this.commit('updateCanvas', Canvas.instance)
  }

  drawFitSizeImage() {
    Canvas.instance.drawFitSizeImage()
    this.commit('updateCanvas', Canvas.instance)
  }

  mouseMoveForPen(config: { xPx: number; yPx: number; penSize: number }) {
    Canvas.instance.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
    this.commit('updateCanvas', Canvas.instance)
  }

  setCanvasCursor(position: Position) {
    Canvas.instance.cursor = position
    this.commit('updateCanvas', Canvas.instance)
  }

  setPenToolSizePx(size: number) {
    Canvas.instance.penToolSizePx = size
    this.commit('updateCanvas', Canvas.instance)
  }

  setMaskMode(mode: number) {
    Canvas.instance.maskMode = mode
    Canvas.instance.manualMode = -1
    this.commit('updateCanvas', Canvas.instance)
  }

  setManualMode(mode: number) {
    // TODO: この処理はDomainに持たせるべき？
    Canvas.instance.manualMode = mode
    Canvas.instance.maskMode = -1
    this.commit('updateCanvas', Canvas.instance)
  }

  setEraserSizePx(size: number) {
    Canvas.instance.eraserSizePx = size
    this.commit('updateCanvas', Canvas.instance)
  }

  setUploadImageUrl(url: string) {
    Canvas.instance.uploadImageUrl = url
    this.commit('updateCanvas', Canvas.instance)
  }

  mouseMoveOnCanvas(position: Position) {
    Canvas.instance.mouseMove(position.xPx, position.yPx)
    this.commit('updateCanvas', Canvas.instance)
  }
}

export const canvas = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
