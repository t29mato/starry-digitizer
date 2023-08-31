import { defineStore } from 'pinia'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'

interface State {
  symbolExtractByArea: SymbolExtractByArea
}

export const useSymbolExtractByAreaStore= defineStore('axes', {
  state :(): State => ({
    symbolExtractByArea: SymbolExtractByArea.instance,
  }),
  getters: {
    symbolExtractByArea: (state: State) => state.symbolExtractByArea,
  },
  actions: {
    setMinDiameterPx({ state }: { state: State }, minDiameterPx: number) {
      state.symbolExtractByArea.minDiameterPx = minDiameterPx
    },
    setMaxDiameterPx({ state }: { state: State }, maxDiameterPx: number) {
      state.symbolExtractByArea.maxDiameterPx = maxDiameterPx
    },
  },
})
