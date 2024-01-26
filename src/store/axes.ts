import { defineStore } from 'pinia'
import { AxisRepository } from '@/domain/repositories/axisRepository/axisRepository'
import { Coord } from '@/domain/models/dataset/datasetInterface'
import { Axis } from '@/domain/models/axis/axis'
import { Vector } from '@/domain/repositories/axisRepository/axisRepositoryInterface'

export interface State {
  axes: Axes
}

export const useAxesStore = defineStore('axes', {
  state: (): State => ({
    axes: new Axes(
      new Axis('x1', 0),
      new Axis('x2', 1),
      new Axis('y1', 0),
      new Axis('y2', 1),
      new Axis('x2y2', -1),
    ),
  }),
  //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
  // getters: {
  //   axes() {
  //     return this.axes
  //   },
  // },
  actions: {
    setX1Value(value: number) {
      this.axes.x1.value = value
    },
    setX2Value(value: number) {
      this.axes.x2.value = value
    },
    setY1Value(value: number) {
      this.axes.y1.value = value
    },
    setY2Value(value: number) {
      this.axes.y2.value = value
    },
    setXIsLog(value: boolean) {
      this.axes.xIsLog = value
    },
    setYIsLog(value: boolean) {
      this.axes.yIsLog = value
    },
    clearAxisCoords() {
      this.axes.clearAxisCoords()
    },
    clearXAxisCoords() {
      this.axes.clearXAxisCoords()
    },
    clearYAxisCoords() {
      this.axes.clearYAxisCoords()
    },
    addAxisCoord(coord: Coord) {
      this.axes.addAxisCoord(coord)
    },
    moveActiveAxis(vector: Vector) {
      this.axes.moveActiveAxis(vector)
    },
    inactivateAxis() {
      this.axes.inactivateAxis()
    },
  },
})
