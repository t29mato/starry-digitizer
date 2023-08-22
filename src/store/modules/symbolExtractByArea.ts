import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'

const symbolExtractByArea = ref(SymbolExtractByArea.instance)

const getters = {
  symbolExtractByArea: computed(() => symbolExtractByArea.value),
}

const actions = {
  setMinDiameterPx(minDiameterPx: number) {
    symbolExtractByArea.value.minDiameterPx = minDiameterPx
  },
  setMaxDiameterPx(maxDiameterPx: number) {
    symbolExtractByArea.value.maxDiameterPx = maxDiameterPx
  },
}

export const useSymbolExtractByAreaStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
