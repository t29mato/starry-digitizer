import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import LineExtract from '@/domains/extractStrategies/lineExtract'

class state {
  lineExtract = LineExtract.instance
}

class getters extends Getters<state> {
  get lineExtract() {
    return this.state.lineExtract
  }
}

class actions extends Actions<state, getters> {
  setDyPx(dyPx: number) {
    LineExtract.instance.dyPx = dyPx
  }

  setDxPx(dxPx: number) {
    LineExtract.instance.dxPx = dxPx
  }
}

export const lineExtract = new Module({
  state,
  actions,
  getters,
})

export const lineExtractMapper = createMapper(lineExtract)
