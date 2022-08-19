import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Axes } from '@/domains/axes/axes'
import { Coord } from '@/domains/datasetInterface'
import { Axis } from '@/domains/axes/axis'

class state {
  axes = new Axes(
    new Axis('x1', 0),
    new Axis('x2', 1),
    new Axis('y1', 0),
    new Axis('y2', 1)
  )
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
  clearAxesCoords() {
    this.state.axes.clearAxesCoords()
  }
  addAxisCoord(coord: Coord) {
    this.state.axes.addAxisCoord(coord)
  }
  moveActiveAxis(arrow: string) {
    this.state.axes.moveActiveAxis(arrow)
  }
  inactivateAxis() {
    this.state.axes.inactivateAxis()
  }
  setX1IsSameAsY1(x1IsSameAsY1: boolean) {
    this.state.axes.x1IsSameAsY1 = x1IsSameAsY1
  }
}

export const axes = new Module({
  state,
  actions,
  getters,
})

export const axesMapper = createMapper(axes)
