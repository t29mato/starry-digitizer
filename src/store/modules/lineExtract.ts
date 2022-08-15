import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import LineExtract from '@/domains/extractStrategies/lineExtract'

class state {
  lineExtract = LineExtract.instance
}

class getters extends Getters<state> {
  get lineExtract() {
    return this.state.lineExtract
  }
}

class mutations extends Mutations<state> {
  updateSymbolExtractByArea(lineExtract: LineExtract) {
    this.state.lineExtract = lineExtract
  }
}

class actions extends Actions<state, getters, mutations> {
  // md
  constructor() {
    super()
    // this.md = md.instance
  }

  setIntervalPx(intervalPx: number) {
    LineExtract.instance.intervalPx = intervalPx
    this.commit('updateSymbolExtractByArea', LineExtract.instance)
  }

  setLineWidthPx(lineWidthPx: number) {
    LineExtract.instance.lineWidthPx = lineWidthPx
    this.commit('updateSymbolExtractByArea', LineExtract.instance)
  }
}

export const lineExtract = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const lineExtractMapper = createMapper(lineExtract)
