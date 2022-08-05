import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Canvas } from '@/domains/canvas'
import { Plot, Plots } from '@/types'
import { DatasetManager as DatasetDomain } from '@/domains/DatasetManager'

class state {
  canvasScale: number = Canvas.instance.canvasScale
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
  scaleUp() {
    Canvas.instance.scaleUp()
    this.commit('updateCanvasScale', Canvas.instance.canvasScale)
  }

  scaleDown() {
    Canvas.instance.scaleDown()
    this.commit('updateCanvasScale', Canvas.instance.canvasScale)
  }

  resizeCanvasToOriginal() {
    Canvas.instance.drawOriginalSizeImage()
    this.commit('updateCanvasScale', Canvas.instance.canvasScale)
  }

  drawFitSizeImage() {
    Canvas.instance.drawFitSizeImage()
    this.commit('updateCanvasScale', Canvas.instance.canvasScale)
  }
}

export const canvas = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const canvasMapper = createMapper(canvas)
