import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/ExtractStrategyInterface'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'

class state {
  extractor = new Extractor(SymbolExtractByArea.instance)
}

class getters extends Getters<state> {
  get extractor() {
    return this.state.extractor
  }
}

class mutations extends Mutations<state> {
  updateExtractor(extractor: Extractor) {
    this.state.extractor = extractor
  }
}

class actions extends Actions<state, getters, mutations> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }

  setColorDistancePct(colorDistancePct: number) {
    this.state.extractor.colorDistancePct = colorDistancePct
    this.commit('updateExtractor', this.state.extractor)
  }
  setStrategy(strategy: ExtractStrategyInterface) {
    this.state.extractor.strategy = strategy
    this.commit('updateExtractor', this.state.extractor)
  }

  setColorPicker(color: string) {
    this.state.extractor.colorPicker = color
    this.commit('updateExtractor', this.state.extractor)
  }

  setSwatches(colorSwatches: string[]) {
    this.state.extractor.updateSwatches(colorSwatches)
    this.commit('updateExtractor', this.state.extractor)
  }
}

export const extractor = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const extractorMapper = createMapper(extractor)
