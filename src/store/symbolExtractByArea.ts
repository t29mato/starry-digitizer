import { defineStore } from 'pinia'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'

export interface State {
  symbolExtractByArea: SymbolExtractByArea
}

export const useSymbolExtractByAreaStore = defineStore('axes', {
  state: (): State => ({
    symbolExtractByArea: SymbolExtractByArea.instance,
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // symbolExtractByArea() {
    //   return this.symbolExtractByArea
    // },
  },
  actions: {
    setMinDiameterPx(minDiameterPx: number) {
      this.symbolExtractByArea.minDiameterPx = minDiameterPx
    },
    setMaxDiameterPx(maxDiameterPx: number) {
      this.symbolExtractByArea.maxDiameterPx = maxDiameterPx
    },
  },
})