import { defineStore } from 'pinia'
import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'
import { Plots, Coord } from '@/domains/datasetInterface'
import { Vector } from '@/domains/axes/axesInterface'

export interface State {
  datasets: Datasets
}

export const useDatasetsStore = defineStore('datasets', {
  state: (): State => ({
    datasets: new Datasets(new Dataset('dataset 1', [], 1)),
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // datasets() {
    //   return this.datasets
    // },
  },
  actions: {
    addPlot(plot: Coord) {
      this.datasets.activeDataset.addPlot(plot.xPx, plot.yPx)
    },
    addDataset() {
      const nextId = this.datasets.nextDatasetId
      this.datasets.addDataset(new Dataset(`dataset ${nextId}`, [], nextId))
    },
    popDataset() {
      this.datasets.popDataset()
    },
    moveActivePlot(vector: Vector) {
      this.datasets.activeDataset.moveActivePlot(vector)
    },
    clearPlot(id: number) {
      this.datasets.activeDataset.clearPlot(id)
    },
    clearPlots() {
      this.datasets.activeDataset.clearPlots()
    },
    inactivatePlots() {
      this.datasets.activeDataset.inactivatePlots()
    },
    clearActivePlots() {
      this.datasets.activeDataset.clearActivePlots()
    },
    setPlots(plots: Plots) {
      this.datasets.setPlots(plots)
    },
    toggleActivatedPlot(id: number) {
      this.datasets.activeDataset.toggleActivatedPlot(id)
    },
    switchActivatedPlot(id: number) {
      this.datasets.activeDataset.switchActivatedPlot(id)
    },
    setActiveDataset(id: number) {
      this.datasets.setActiveDataset(id)
    },
    sortPlots() {
      this.datasets.sortPlots()
    },
    activatePlotsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord) {
      return this.datasets.activatePlotsInRectangleArea(
        topLeftCoord,
        bottomRightCoord,
      )
    },
  },
})
