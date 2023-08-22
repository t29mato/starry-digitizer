import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'
import { Plots, Coord } from '@/domains/datasetInterface'
import { Vector } from '@/domains/axes/axesInterface'
import { ref } from 'vue'
import { computed } from 'vue'
import { useStore } from 'vuex'

const state = ref({
  datasets: new Datasets(new Dataset('dataset 1', [], 1)),
})

const getters = {
  datasets: computed(() => state.value.datasets),
  activeDataset: computed(() => state.value.datasets.activeDataset),
}

const actions = {
  addPlot(plot: Coord) {
    state.value.datasets.activeDataset.addPlot(plot.xPx, plot.yPx)
  },
  addDataset() {
    const nextId = state.value.datasets.nextDatasetId
    state.value.datasets.addDataset(
      new Dataset(`dataset ${nextId}`, [], nextId)
    )
  },
  popDataset() {
    state.value.datasets.popDataset()
  },
  moveActivePlot(vector: Vector) {
    state.value.datasets.activeDataset.moveActivePlot(vector)
  },
  clearPlot(id: number) {
    state.value.datasets.activeDataset.clearPlot(id)
  },
  clearPlots() {
    state.value.datasets.activeDataset.clearPlots()
  },
  inactivatePlots() {
    state.value.datasets.activeDataset.inactivatePlots()
  },
  clearActivePlots() {
    state.value.datasets.activeDataset.clearActivePlots()
  },
  setPlots(plots: Plots) {
    state.value.datasets.setPlots(plots)
  },
  toggleActivatedPlot(id: number) {
    state.value.datasets.activeDataset.toggleActivatedPlot(id)
  },
  activatePlot(id: number) {
    state.value.datasets.activeDataset.activatePlot(id)
  },
  setActiveDataset(id: number) {
    state.value.datasets.setActiveDataset(id)
  },
  sortPlots() {
    state.value.datasets.sortPlots()
  },
}

export const useDatasetStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
