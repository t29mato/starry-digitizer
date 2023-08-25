import { Module } from 'vuex'

interface State {
  plotSizePx: number
  axisSizePx: number
}

const state: State = {
  plotSizePx: 10,
  axisSizePx: 20,
}

const getters = {
  plotSizePx: (state: State) => state.plotSizePx,
  axisSizePx: (state: State) => state.axisSizePx,
  axisHalfSizePx: (state: State) => state.axisSizePx / 2,
  axisCrossBorderPx: (state: State) => state.axisSizePx * 0.1,
  axisCrossBorderHalfPx: (state: State, getters: any) =>
    getters.axisCrossBorderPx * 0.5,
  axisCrossTopPx: (state: State, getters: any) =>
    (state.axisSizePx - getters.axisCrossBorderPx) / 2,
  axisCrossCursorPx: (state: State) => state.axisSizePx * 0.7,
}

const mutations = {
  updatePlotSizePx(state: State, newPlotSizePx: number) {
    state.plotSizePx = newPlotSizePx
  },
  updateAxisSizePx(state: State, newAxisSizePx: number) {
    state.axisSizePx = newAxisSizePx
  },
}

const actions = {
  setPlotSizePx({ commit }: any, size: number) {
    commit('updatePlotSizePx', size)
  },
  setAxisSizePx({ commit }: any, size: number) {
    commit('updateAxisSizePx', size)
  },
}

export const style: Module<State, any> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
