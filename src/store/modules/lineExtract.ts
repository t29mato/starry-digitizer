import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import LineExtract from '@/domains/extractStrategies/lineExtract'

const lineExtract = ref(LineExtract.instance)

const getters = {
  lineExtract: computed(() => lineExtract.value),
}

const actions = {
  setDyPx(dyPx: number) {
    lineExtract.value.dyPx = dyPx
  },
  setDxPx(dxPx: number) {
    lineExtract.value.dxPx = dxPx
  },
}

export const useLineExtractStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
