import { defineStore } from 'pinia'
import { Axes } from '@/domains/axes/axes'
import { Coord } from '@/domains/datasetInterface'
import { Axis } from '@/domains/axes/axis'
import { Vector } from '@/domains/axes/axesInterface'

interface State {
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
  getters: {
    axes: (state: State) => state.axes,
  },
  actions: {
    setX1Value({ state }: { state: State }, value: number) {
      state.axes.x1.value = value
    },
    setX2Value({ state }: { state: State }, value: number) {
      state.axes.x2.value = value
    },
    setY1Value({ state }: { state: State }, value: number) {
      state.axes.y1.value = value
    },
    setY2Value({ state }: { state: State }, value: number) {
      state.axes.y2.value = value
    },
    setXIsLog({ state }: { state: State }, value: boolean) {
      state.axes.xIsLog = value
    },
    setYIsLog({ state }: { state: State }, value: boolean) {
      state.axes.yIsLog = value
    },
    clearAxesCoords({ state }: { state: State }) {
      state.axes.clearAxesCoords()
    },
    clearXAxisCoords({ state }: { state: State }) {
      state.axes.clearXAxisCoords()
    },
    clearYAxisCoords({ state }: { state: State }) {
      state.axes.clearYAxisCoords()
    },
    addAxisCoord({ state }: { state: State }, coord: Coord) {
      state.axes.addAxisCoord(coord)
    },
    moveActiveAxis({ state }: { state: State }, vector: Vector) {
      state.axes.moveActiveAxis(vector)
    },
    inactivateAxis({ state }: { state: State }) {
      state.axes.inactivateAxis()
    },
  },
})
