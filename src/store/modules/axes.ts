import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Axes } from '@/domains/axes'

class state {
  axes = new Axes()
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
    this.state.axes.x1.value = value
    this.commit('updateAxes', this.state.axes)
  }
  setX2Value(value: number) {
    this.state.axes.x2.value = value
    this.commit('updateAxes', this.state.axes)
  }
  setY1Value(value: number) {
    this.state.axes.y1.value = value
    this.commit('updateAxes', this.state.axes)
  }
  setY2Value(value: number) {
    this.state.axes.y2.value = value
    this.commit('updateAxes', this.state.axes)
  }
  setXIsLog(value: boolean) {
    this.state.axes.xIsLog = value
    this.commit('updateAxes', this.state.axes)
  }
  setYIsLog(value: boolean) {
    this.state.axes.yIsLog = value
    this.commit('updateAxes', this.state.axes)
  }
  clearAxes() {
    this.state.axes.clearAxes()
    this.commit('updateAxes', this.state.axes)
  }
  addAxis(axis: { xPx: number; yPx: number }) {
    this.state.axes.addAxisPosition(axis.xPx, axis.yPx)
    this.commit('updateAxes', this.state.axes)
  }
  moveActiveAxis(arrow: string) {
    this.state.axes.moveActiveAxis(arrow)
    this.commit('updateAxes', this.state.axes)
  }
  inactivateAxis() {
    this.state.axes.inactivateAxis()
    this.commit('updateAxes', this.state.axes)
  }
}

export const axes = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const axesMapper = createMapper(axes)
