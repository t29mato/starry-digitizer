import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'

class state {
  symbolExtractByArea = SymbolExtractByArea.instance
}

class getters extends Getters<state> {
  get symbolExtractByArea() {
    return this.state.symbolExtractByArea
  }
}

class mutations extends Mutations<state> {
  updateSymbolExtractByArea(symbolExtractByArea: SymbolExtractByArea) {
    this.state.symbolExtractByArea = symbolExtractByArea
  }
}

class actions extends Actions<state, getters, mutations> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }

  setMinDiameterPx(minDiameterPx: number) {
    SymbolExtractByArea.instance.minDiameterPx = minDiameterPx
    this.commit('updateSymbolExtractByArea', SymbolExtractByArea.instance)
  }

  setMaxDiameterPx(maxDiameterPx: number) {
    SymbolExtractByArea.instance.maxDiameterPx = maxDiameterPx
    this.commit('updateSymbolExtractByArea', SymbolExtractByArea.instance)
  }
}

export const symbolExtractByArea = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const symbolExtractByAreaMapper = createMapper(symbolExtractByArea)
