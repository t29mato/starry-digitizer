import { defineStore } from 'pinia'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { Dataset } from '@/domain/models/dataset/dataset'
import { Coord } from '@/domain/models/dataset/datasetInterface'
import { Vector } from '@/domain/repositories/axisRepository/axisRepositoryInterface'

export interface State {
  datasets: DatasetRepository
}

export const useDatasetsStore = defineStore('datasets', {
  state: (): State => ({
    datasets: new DatasetRepository(new Dataset('dataset 1', [], 1)),
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
    setPlots(coords: Coord[]) {
      this.datasets.setPlots(coords)
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
