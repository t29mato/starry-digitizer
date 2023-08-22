import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { Magnifier } from '@/domains/magnifier'

const magnifier = ref(new Magnifier())

const getters = {
  magnifier: computed(() => magnifier.value),
}

const actions = {
  setScale(scale: number) {
    magnifier.value.setScale(scale)
  },
}

export const useMagnifierStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
