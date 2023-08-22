import { createStore, useStore } from 'vuex'
import { Axes } from '@/domains/axes/axes'
import { Axis } from '@/domains/axes/axis'
import { Coord } from '@/domains/datasetInterface'
import { Vector } from '@/domains/axes/axesInterface'
import { ref } from 'vue'
import { computed } from 'vue'

const state = ref({
  axes: new Axes(
    new Axis('x1', 0),
    new Axis('x2', 1),
    new Axis('y1', 0),
    new Axis('y2', 1),
    new Axis('x2y2', -1)
  ),
})

const getters = {
  axes: computed(() => state.value.axes),
}

const actions = {
  setX1Value(value: number) {
    state.value.axes.x1.value = value
  },
  setX2Value(value: number) {
    state.value.axes.x2.value = value
  },
  setY1Value(value: number) {
    state.value.axes.y1.value = value
  },
  setY2Value(value: number) {
    state.value.axes.y2.value = value
  },
  setXIsLog(value: boolean) {
    state.value.axes.xIsLog = value
  },
  setYIsLog(value: boolean) {
    state.value.axes.yIsLog = value
  },
  clearAxesCoords() {
    state.value.axes.clearAxesCoords()
  },
  clearXAxisCoords() {
    state.value.axes.clearXAxisCoords()
  },
  clearYAxisCoords() {
    state.value.axes.clearYAxisCoords()
  },
  addAxisCoord(coord: Coord) {
    state.value.axes.addAxisCoord(coord)
  },
  moveActiveAxis(vector: Vector) {
    state.value.axes.moveActiveAxis(vector)
  },
  inactivateAxis() {
    state.value.axes.inactivateAxis()
  },
}

// Export the composed store instance
export const useAxesStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
