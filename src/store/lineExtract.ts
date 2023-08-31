import { defineStore } from 'pinia'
import LineExtract from '@/domains/extractStrategies/lineExtract'

interface State {
  lineExtract: LineExtract
}


export const useLineExtractStore = defineStore('lineExtract', {
  state: (): State => ({
    lineExtract: LineExtract.instance,
  }),
  getters: {
    lineExtract: (state: State) => state.lineExtract,
  },
  actions:{
    setDyPx({ state }: { state: State }, dyPx: number) {
      state.lineExtract.dyPx = dyPx
    },
    setDxPx({ state }: { state: State }, dxPx: number) {
      state.lineExtract.dxPx = dxPx
    },
  },
})
