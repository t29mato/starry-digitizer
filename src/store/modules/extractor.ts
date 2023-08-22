import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { Extractor } from '@/domains/extractor'
import ExtractStrategyInterface from '@/domains/extractStrategies/extractStrategyInterface'
import LineExtract from '@/domains/extractStrategies/lineExtract'

const extractor = ref(new Extractor(LineExtract.instance))

const getters = {
  extractor: computed(() => extractor.value),
}

const actions = {
  setColorDistancePct(colorDistancePct: number) {
    extractor.value.colorDistancePct = colorDistancePct
  },
  setStrategy(strategy: ExtractStrategyInterface) {
    extractor.value.strategy = strategy
  },
  setColorPicker(color: string) {
    extractor.value.colorPicker = color
  },
  setSwatches(colorSwatches: string[]) {
    extractor.value.updateSwatches(colorSwatches)
  },
}

export const useExtractorStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
