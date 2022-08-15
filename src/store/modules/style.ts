import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'

class state {
  plotSizePx = 10
  axisSizePx = 10
}

class getters extends Getters<state> {
  get plotSizePx() {
    return this.state.plotSizePx
  }
  get axisSizePx() {
    return this.state.axisSizePx
  }
  get axisHalfSizePx() {
    return this.state.axisSizePx / 2
  }
}

class mutations extends Mutations<state> {
  updatePlotSizePx(newPlotSizePx: number) {
    this.state.plotSizePx = newPlotSizePx
  }
  updateAxisSizePx(newAxisSizePx: number) {
    this.state.axisSizePx = newAxisSizePx
  }
}

class actions extends Actions<state, getters, mutations> {
  setPlotSizePx(size: number) {
    this.commit('updatePlotSizePx', size)
  }
  setAxisSizePx(size: number) {
    this.commit('updateAxisSizePx', size)
  }
}

export const style = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const styleMapper = createMapper(style)
