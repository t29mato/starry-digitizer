import { defineStore } from 'pinia'
import { Magnifier } from '@/domains/magnifier'

interface State {
  magnifier: Magnifier
}

export const useMagnifierStore = defineStore('magnifier', {
  state: (): State => ({
    magnifier: new Magnifier(),
  }),
  getters: {
    magnifier: (state: State) => state.magnifier,
  },
  actions: {
    setScale(state: State, scale: number): void {
      state.magnifier.setScale(scale)
    },
  },
})
