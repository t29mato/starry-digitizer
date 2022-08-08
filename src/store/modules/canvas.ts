import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Canvas } from '@/domains/canvas'

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
}

export const canvas = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
