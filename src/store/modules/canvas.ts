import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { CanvasManager as CanvasDomain } from '@/domains/CanvasManager'
import { Plot, Plots } from '@/types'
import { DatasetManager as DatasetDomain } from '@/domains/DatasetManager'

class state {
  canvasScale: number = CanvasDomain.instance.canvasScale
}

class getters extends Getters<state> {
  get canvasScale() {
    return this.state.canvasScale
  }
}

class mutations extends Mutations<state> {
  updateCanvasScale(newScale: number) {
    this.state.canvasScale = newScale
  }
}

class actions extends Actions<state, getters, mutations> {
  canvasDomain
  constructor() {
    super()
    this.canvasDomain = CanvasDomain.instance
  }

  scaleUp() {
    this.canvasDomain.scaleUp()
    this.commit('updateCanvasScale', this.canvasDomain.canvasScale)
  }

  scaleDown() {
    this.canvasDomain.scaleDown()
    this.commit('updateCanvasScale', this.canvasDomain.canvasScale)
  }

  resizeCanvasToOriginal() {
    this.canvasDomain.drawOriginalSizeImage()
    this.commit('updateCanvasScale', this.canvasDomain.canvasScale)
  }

  drawFitSizeImage() {
    this.canvasDomain.drawFitSizeImage()
    this.commit('updateCanvasScale', this.canvasDomain.canvasScale)
  }
}

export const canvas = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
