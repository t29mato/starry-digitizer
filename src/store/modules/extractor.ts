import { Module } from 'vuex'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/extractStrategyInterface'
import LineExtract from '@/domains/extractStrategies/lineExtract'

interface State {
  extractor: Extractor
}

const state: State = {
  extractor: new Extractor(LineExtract.instance),
}

const getters = {
  extractor: (state: State) => state.extractor,
}

const mutations = {
  // Mutations if any
}

const actions = {
  setColorDistancePct({ state }: { state: State }, colorDistancePct: number) {
    state.extractor.colorDistancePct = colorDistancePct
  },
  setStrategy({ state }: { state: State }, strategy: ExtractStrategyInterface) {
    state.extractor.strategy = strategy
  },
  setColorPicker({ state }: { state: State }, color: string) {
    state.extractor.colorPicker = color
  },
  setSwatches({ state }: { state: State }, colorSwatches: string[]) {
    state.extractor.updateSwatches(colorSwatches)
  },
}

export const extractor: Module<State, any> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
