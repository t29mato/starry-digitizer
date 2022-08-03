import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Axes, AxesManager as AM, AxesManager } from '@/domains/AxesManager'
import { Plot, Plots } from '@/types'
import { DatasetManager as DatasetDomain } from '@/domains/DatasetManager'
const am = AM.instance

class state {
  axes = am.axes
  xIsLog = am.xIsLog
  yIsLog = am.yIsLog
  axesValuesErrorMessage = am.axesValuesErrorMessage
  am = am
}

class getters extends Getters<state> {
  get axes() {
    return this.state.axes
  }
  get xIsLog() {
    return this.state.xIsLog
  }
  get yIsLog() {
    return this.state.yIsLog
  }
  get axesValuesErrorMessage() {
    return this.state.axesValuesErrorMessage
  }
}

class mutations extends Mutations<state> {
  updateAM(am: AM) {
    this.state.am = am
  }
}

class actions extends Actions<state, getters, mutations> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }

  setX1Value(value: number) {
    am.axes.x1.value = value
    this.commit('updateAM', am)
  }
  setX2Value(value: number) {
    am.axes.x2.value = value
    this.commit('updateAM', am)
  }
  setY1Value(value: number) {
    am.axes.y1.value = value
    this.commit('updateAM', am)
  }
  setY2Value(value: number) {
    am.axes.y1.value = value
    this.commit('updateAM', am)
  }
  setXIsLog(value: boolean) {
    am.xIsLog = value
    this.commit('updateAM', am)
  }
  setYIsLog(value: boolean) {
    am.yIsLog = value
    this.commit('updateAM', am)
  }
}

export const axes = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const axesMapper = createMapper(axes)
