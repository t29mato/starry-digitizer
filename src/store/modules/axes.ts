import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Axes } from '@/domains/axes'

class state {
  axes = new Axes()
}

class getters extends Getters<state> {
  get axes() {
    return this.state.axes
  }
}

class actions extends Actions<state, getters> {
  constructor() {
    super()
  }

  setX1Value(value: number) {
    this.state.axes.x1.value = value
  }
  setX2Value(value: number) {
    this.state.axes.x2.value = value
  }
  setY1Value(value: number) {
    this.state.axes.y1.value = value
  }
  setY2Value(value: number) {
    this.state.axes.y2.value = value
  }
  setXIsLog(value: boolean) {
    this.state.axes.xIsLog = value
  }
  setYIsLog(value: boolean) {
    this.state.axes.yIsLog = value
  }
  clearAxes() {
    this.state.axes.clearAxes()
  }
  addAxis(axis: { xPx: number; yPx: number }) {
    this.state.axes.addAxisPosition(axis.xPx, axis.yPx)
  }
  moveActiveAxis(arrow: string) {
    this.state.axes.moveActiveAxis(arrow)
  }
  inactivateAxis() {
    this.state.axes.inactivateAxis()
  }
}

export const axes = new Module({
  state,
  actions,
  getters,
})

export const axesMapper = createMapper(axes)
