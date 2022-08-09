import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Extractor, ExtractStrategy } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/ExtractStrategyInterface'

class state {
  extractor = Extractor.instance
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

  setStrategy(strategy: ExtractStrategyInterface) {
    Extractor.instance.strategy = strategy
    this.commit('updateExtractor', Extractor.instance)
  }
}

export const extractor = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const extractorMapper = createMapper(extractor)
