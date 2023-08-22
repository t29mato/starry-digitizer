import { ref, computed } from 'vue'
import { useStore } from 'vuex'

const state = ref({
  plotSizePx: 10,
  axisSizePx: 20,
})

const getters: any = {
  plotSizePx: computed(() => state.value.plotSizePx),
  axisSizePx: computed(() => state.value.axisSizePx),
  axisHalfSizePx: computed(() => state.value.axisSizePx / 2),
  axisCrossBorderPx: computed(() => state.value.axisSizePx * 0.1),
  axisCrossBorderHalfPx: computed(() => getters.axisCrossBorderPx.value * 0.5),
  axisCrossTopPx: computed(
    () => (state.value.axisSizePx - getters.axisCrossBorderPx.value) / 2
  ),
  axisCrossCursorPx: computed(() => state.value.axisSizePx * 0.7),
}

const mutations = {
  updatePlotSizePx(newPlotSizePx: number) {
    state.value.plotSizePx = newPlotSizePx
  },
  updateAxisSizePx(newAxisSizePx: number) {
    state.value.axisSizePx = newAxisSizePx
  },
}

const actions = {
  setPlotSizePx({ commit }: any, size: number) {
    commit('updatePlotSizePx', size)
  },
  setAxisSizePx({ commit }: any, size: number) {
    commit('updateAxisSizePx', size)
  },
}

export const useStyleStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...mutations,
    ...actions,
  }
}
