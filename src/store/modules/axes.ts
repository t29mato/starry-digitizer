import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Axes } from '@/domains/AxesManager'
import { Plot, Plots } from '@/types'
import { DatasetManager as DatasetDomain } from '@/domains/DatasetManager'

class state {
  axes = Axes.instance
}

class getters extends Getters<state> {
  get axes() {
    return this.state.axes
  }
}

class mutations extends Mutations<state> {
  updateAxes(axes: Axes) {
    this.state.axes = axes
  }
}

class actions extends Actions<state, getters, mutations> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }

  setX1Value(value: number) {
    Axes.instance.x1.value = value
    this.commit('updateAxes', Axes.instance)
  }
  setX2Value(value: number) {
    Axes.instance.x2.value = value
    this.commit('updateAxes', Axes.instance)
  }
  setY1Value(value: number) {
    Axes.instance.y1.value = value
    this.commit('updateAxes', Axes.instance)
  }
  setY2Value(value: number) {
    Axes.instance.y1.value = value
    this.commit('updateAxes', Axes.instance)
  }
  setXIsLog(value: boolean) {
    Axes.instance.xIsLog = value
    this.commit('updateAxes', Axes.instance)
  }
  setYIsLog(value: boolean) {
    Axes.instance.yIsLog = value
    this.commit('updateAxes', Axes.instance)
  }
}

export const axes = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const axesMapper = createMapper(axes)
