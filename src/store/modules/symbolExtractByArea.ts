import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'

class state {
  symbolExtractByArea = SymbolExtractByArea.instance
}

class getters extends Getters<state> {
  get symbolExtractByArea() {
    return this.state.symbolExtractByArea
  }
}

class actions extends Actions<state, getters> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }
  setMinDiameterPx(minDiameterPx: number) {
    SymbolExtractByArea.instance.minDiameterPx = minDiameterPx
  }

  setMaxDiameterPx(maxDiameterPx: number) {
    SymbolExtractByArea.instance.maxDiameterPx = maxDiameterPx
  }
}

export const symbolExtractByArea = new Module({
  state,
  actions,
  getters,
})

export const symbolExtractByAreaMapper = createMapper(symbolExtractByArea)
