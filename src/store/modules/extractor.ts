import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/extractStrategyInterface'
import LineExtract from '@/domains/extractStrategies/lineExtract'

class state {
  extractor = new Extractor(LineExtract.instance)
}

class getters extends Getters<state> {
  get extractor() {
    return this.state.extractor
  }
}

class actions extends Actions<state, getters> {
  setColorDistancePct(colorDistancePct: number) {
    this.state.extractor.colorDistancePct = colorDistancePct
  }
  setStrategy(strategy: ExtractStrategyInterface) {
    this.state.extractor.strategy = strategy
  }

  setColorPicker(color: string) {
    this.state.extractor.colorPicker = color
  }

  setSwatches(colorSwatches: string[]) {
    this.state.extractor.updateSwatches(colorSwatches)
  }
}

export const extractor = new Module({
  state,
  actions,
  getters,
})

export const extractorMapper = createMapper(extractor)
