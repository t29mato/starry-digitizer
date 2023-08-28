import { Module } from 'vuex'
import { Magnifier } from '@/domains/magnifier'

interface State {
  magnifier: Magnifier
}

const state: State = {
  magnifier: new Magnifier(),
}

const getters = {
  magnifier: (state: State) => state.magnifier,
}

const mutations = {
  // Mutations if any
}

const actions = {
  setScale({ state }: { state: State }, scale: number): void {
    state.magnifier.setScale(scale)
  },
}

export const magnifier: Module<State, any> = {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}
