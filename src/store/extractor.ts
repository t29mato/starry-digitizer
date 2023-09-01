import { defineStore } from 'pinia'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/extractStrategyInterface'
import LineExtract from '@/domains/extractStrategies/lineExtract'

export interface State {
  extractor: Extractor
}

export const useExtractorStore = defineStore('extractor', {
  state: (): State => ({
    extractor: new Extractor(LineExtract.instance),
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // extractor() {
    //   return this.extractor
    // },
  },
  actions: {
    setColorDistancePct(colorDistancePct: number) {
      this.extractor.colorDistancePct = colorDistancePct
    },
    setStrategy(strategy: ExtractStrategyInterface) {
      this.extractor.strategy = strategy
    },
    setColorPicker(color: string) {
      this.extractor.colorPicker = color
    },
    setSwatches(colorSwatches: string[]) {
      this.extractor.updateSwatches(colorSwatches)
    },
  },
})
