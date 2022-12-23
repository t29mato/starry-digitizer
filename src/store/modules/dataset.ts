import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'
import { Plots, Coord } from '@/domains/datasetInterface'
import { Vector } from '@/domains/axes/axesInterface'

class state {
  datasets: Datasets = new Datasets(new Dataset('dataset 1', [], 1))
}

class getters extends Getters<state> {
  get datasets() {
    return this.state.datasets
  }
}

class actions extends Actions<state, getters> {
  addPlot(plot: Coord) {
    this.state.datasets.activeDataset.addPlot(plot.xPx, plot.yPx)
  }
  addDataset() {
    const nextId = this.state.datasets.nextDatasetId
    this.state.datasets.addDataset(new Dataset(`dataset ${nextId}`, [], nextId))
  }
  popDataset() {
    this.state.datasets.popDataset()
  }
  moveActivePlot(vector: Vector) {
    this.state.datasets.activeDataset.moveActivePlot(vector)
  }
  clearPlot(id: number) {
    this.state.datasets.activeDataset.clearPlot(id)
  }
  clearPlots() {
    this.state.datasets.activeDataset.clearPlots()
  }
  inactivatePlots() {
    this.state.datasets.activeDataset.inactivatePlots()
  }
  clearActivePlots() {
    this.state.datasets.activeDataset.clearActivePlots()
  }
  setPlots(plots: Plots) {
    this.state.datasets.setPlots(plots)
  }
  toggleActivatedPlot(id: number) {
    this.state.datasets.activeDataset.toggleActivatedPlot(id)
  }
  activatePlot(id: number) {
    this.state.datasets.activeDataset.activatePlot(id)
  }
  setActiveDataset(id: number) {
    this.state.datasets.setActiveDataset(id)
  }
  sortPlots() {
    this.state.datasets.sortPlots()
  }
}

export const dataset = new Module({
  state,
  actions,
  getters,
})

export const datasetMapper = createMapper(dataset)
