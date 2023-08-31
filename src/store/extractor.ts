import { defineStore } from 'pinia'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/extractStrategyInterface'
import LineExtract from '@/domains/extractStrategies/lineExtract'

interface State {
  extractor: Extractor
}

export const useExtractorStore = defineStore('extractor', {
  state: (): State => ({
    extractor: new Extractor(LineExtract.instance),
  })
  ,
  getters: {
    extractor: (state: State) => state.extractor,
  },
  actions: {
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
  },
})
