import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'

class state {
  plotSizePx = 10
}

class getters extends Getters<state> {
  get plotSizePx() {
    return this.state.plotSizePx
  }
}

class mutations extends Mutations<state> {
  updatePlotSizePx(newPlotSizePx: number) {
    this.state.plotSizePx = newPlotSizePx
  }
}

class actions extends Actions<state, getters, mutations> {
  setPlotSizePx(size: number) {
    this.commit('updatePlotSizePx', size)
  }
}

export const style = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const styleMapper = createMapper(style)
