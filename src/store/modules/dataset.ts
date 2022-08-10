import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Plots, Position } from '@/types'
import { Datasets } from '@/domains/datasets'
import { Dataset } from '@/domains/dataset'

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
    this.state.datasets.addPlot(plot.xPx, plot.yPx)
    this.commit('updateDatasets', this.state.datasets)
  }
  addDataset() {
    this.state.datasets.addDataset(new Dataset('dataset 1', [], 1))
    this.commit('updateDatasets', this.state.datasets)
  }
  popDataset() {
    this.state.datasets.popDataset()
    this.commit('updateDatasets', this.state.datasets)
  }
  moveActivePlot(arrow: string) {
    this.state.datasets.moveActivePlot(arrow)
    this.commit('updateDatasets', this.state.datasets)
  }
  clearPlots() {
    this.state.datasets.clearPlots()
    this.commit('updateDatasets', this.state.datasets)
  }
  clearActivePlots() {
    this.state.datasets.clearActivePlots()
    this.commit('updateDatasets', this.state.datasets)
  }
  setPlots(plots: Plots) {
    this.state.datasets.setPlots(plots)
    this.commit('updateDatasets', this.state.datasets)
  }
  toggleActivatedPlot(id: number) {
    this.state.datasets.toggleActivatedPlot(id)
    this.commit('updateDatasets', this.state.datasets)
  }
  activatePlot(id: number) {
    this.state.datasets.activatePlot(id)
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
