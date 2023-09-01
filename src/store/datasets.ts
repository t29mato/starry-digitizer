import { defineStore } from 'pinia'
import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'
import { Plots, Coord } from '@/domains/datasetInterface'
import { Vector } from '@/domains/axes/axesInterface'

interface State {
  datasets: Datasets
}

export const useDatasetsStore = defineStore('datasets', {
  state: (): State => ({
    datasets: new Datasets(new Dataset('dataset 1', [], 1)),
  }),
  getters: {
    datasets: (state: State) => state.datasets,
  },
  actions: {
    addPlot(state: State, plot: Coord) {
      state.datasets.activeDataset.addPlot(plot.xPx, plot.yPx)
    },
    addDataset(state: State) {
      const nextId = state.datasets.nextDatasetId
      state.datasets.addDataset(new Dataset(`dataset ${nextId}`, [], nextId))
    },
    popDataset(state: State) {
      state.datasets.popDataset()
    },
    moveActivePlot(state: State, vector: Vector) {
      state.datasets.activeDataset.moveActivePlot(vector)
    },
    clearPlot(state: State, id: number) {
      state.datasets.activeDataset.clearPlot(id)
    },
    clearPlots(state: State) {
      state.datasets.activeDataset.clearPlots()
    },
    inactivatePlots(state: State) {
      state.datasets.activeDataset.inactivatePlots()
    },
    clearActivePlots(state: State) {
      state.datasets.activeDataset.clearActivePlots()
    },
    setPlots(state: State, plots: Plots) {
      state.datasets.setPlots(plots)
    },
    toggleActivatedPlot(state: State, id: number) {
      state.datasets.activeDataset.toggleActivatedPlot(id)
    },
    activatePlot(state: State, id: number) {
      state.datasets.activeDataset.activatePlot(id)
    },
    setActiveDataset(state: State, id: number) {
      state.datasets.setActiveDataset(id)
    },
    sortPlots(state: State) {
      state.datasets.sortPlots()
    },
  },
})
