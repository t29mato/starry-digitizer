import { Module } from 'vuex'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'

interface State {
  symbolExtractByArea: SymbolExtractByArea
}

const state: State = {
  symbolExtractByArea: SymbolExtractByArea.instance,
}

const getters = {
  symbolExtractByArea: (state: State) => state.symbolExtractByArea,
}

const mutations = {
  // Mutations if any
}

const actions = {
  setMinDiameterPx({ state }: { state: State }, minDiameterPx: number) {
    state.symbolExtractByArea.minDiameterPx = minDiameterPx
  },
  setMaxDiameterPx({ state }: { state: State }, maxDiameterPx: number) {
    state.symbolExtractByArea.maxDiameterPx = maxDiameterPx
  },
}

export const symbolExtractByArea: Module<State, any> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
