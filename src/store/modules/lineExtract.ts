import { Module } from 'vuex'
import LineExtract from '@/domains/extractStrategies/lineExtract'

interface State {
  lineExtract: LineExtract
}

const state: State = {
  lineExtract: LineExtract.instance,
}

const getters = {
  lineExtract: (state: State) => state.lineExtract,
}

const mutations = {
  // Mutations if any
}

const actions = {
  setDyPx({ state }: { state: State }, dyPx: number) {
    state.lineExtract.dyPx = dyPx
  },

  setDxPx({ state }: { state: State }, dxPx: number) {
    state.lineExtract.dxPx = dxPx
  },
}

export const lineExtract: Module<State, any> = {
  state,
  getters,
  mutations,
  actions,
}
