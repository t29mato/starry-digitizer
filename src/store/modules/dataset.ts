import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'
import { Plots, Position } from '@/domains/datasetInterface'

class state {
  datasets: Datasets = new Datasets(new Dataset('dataset 1', [], 1))
}

class getters extends Getters<state> {
  get datasets() {
    return this.state.datasets
  }
}

class mutations extends Mutations<state> {
  updateDatasets(newDatasets: Datasets) {
    this.state.datasets = newDatasets
  }
}

class actions extends Actions<state, getters, mutations> {
  addPlot(plot: Position) {
    this.state.datasets.activeDataset.addPlot(plot.xPx, plot.yPx)
    this.commit('updateDatasets', this.state.datasets)
  }
  addDataset() {
    const nextId = this.state.datasets.nextDatasetId
    this.state.datasets.addDataset(new Dataset(`dataset ${nextId}`, [], nextId))
    this.commit('updateDatasets', this.state.datasets)
  }
  popDataset() {
    this.state.datasets.popDataset()
    this.commit('updateDatasets', this.state.datasets)
  }
  moveActivePlot(arrow: string) {
    this.state.datasets.activeDataset.moveActivePlot(arrow)
    this.commit('updateDatasets', this.state.datasets)
  }
  clearPlot(id: number) {
    this.state.datasets.activeDataset.clearPlot(id)
    this.commit('updateDatasets', this.state.datasets)
  }
  clearPlots() {
    this.state.datasets.activeDataset.clearPlots()
    this.commit('updateDatasets', this.state.datasets)
  }
  cancelActivePlots() {
    this.state.datasets.activeDataset.cancelActivePlots()
  }
  clearActivePlots() {
    this.state.datasets.activeDataset.clearActivePlots()
    this.commit('updateDatasets', this.state.datasets)
  }
  setPlots(plots: Plots) {
    this.state.datasets.setPlots(plots)
    this.commit('updateDatasets', this.state.datasets)
  }
  toggleActivatedPlot(id: number) {
    this.state.datasets.activeDataset.toggleActivatedPlot(id)
    this.commit('updateDatasets', this.state.datasets)
  }
  activatePlot(id: number) {
    this.state.datasets.activeDataset.activatePlot(id)
    this.commit('updateDatasets', this.state.datasets)
  }
  setActiveDataset(id: number) {
    this.state.datasets.setActiveDataset(id)
    this.commit('updateDatasets', this.state.datasets)
  }
  sortPlots() {
    this.state.datasets.sortPlots()
    this.commit('updateDatasets', this.state.datasets)
  }
}

export const dataset = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const datasetMapper = createMapper(dataset)
