import { defineStore } from 'pinia'

interface State {
  plotSizePx: number
  axisSizePx: number
}

export const useStyleStore = defineStore('style', {
  state: (): State => ({
    plotSizePx: 10,
    axisSizePx: 20,
  }),
  getters:  {
    plotSizePx: (state: State) => state.plotSizePx,
    axisSizePx: (state: State) => state.axisSizePx,
    axisHalfSizePx: (state: State) => state.axisSizePx / 2,
    axisCrossBorderPx: (state: State): number => state.axisSizePx * 0.1,
    axisCrossBorderHalfPx(): number {
      return this.axisCrossBorderPx * 0.5
    },
    axisCrossTopPx(state: State): number {
      return (state.axisSizePx - this.axisCrossBorderPx) / 2
    },
    axisCrossCursorPx: (state: State) => state.axisSizePx * 0.7,
  },
  actions: {
    setPlotSizePx({ commit }: any, size: number) {
      commit('updatePlotSizePx', size)
    },
    setAxisSizePx({ commit }: any, size: number) {
      commit('updateAxisSizePx', size)
    },
    //moved from mutations
    updatePlotSizePx(state: State, newPlotSizePx: number) {
      state.plotSizePx = newPlotSizePx
    },
    //moved from mutations
    updateAxisSizePx(state: State, newAxisSizePx: number) {
      state.axisSizePx = newAxisSizePx
    },
  },
})
