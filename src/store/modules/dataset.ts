import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Plots, Position } from '@/types'
import { Dataset, Datasets, Datasets as DD } from '@/domains/datasets'
const dd = DD.instance

class state {
  datasets: Datasets = dd
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
  dd
  constructor() {
    super()
    this.dd = dd
  }

  addPlot(plot: Position) {
    this.dd.addPlot(plot.xPx, plot.yPx)
    this.commit('updateDatasets', this.dd)
  }
  addDataset() {
    this.dd.addDataset()
    this.commit('updateDatasets', this.dd)
  }
  popDataset() {
    this.dd.popDataset()
    this.commit('updateDatasets', this.dd)
  }
  moveActivePlot(arrow: string) {
    this.dd.moveActivePlot(arrow)
    this.commit('updateDatasets', this.dd)
  }
  clearPlots() {
    this.dd.clearPlots()
    this.commit('updateDatasets', this.dd)
  }
  clearActivePlots() {
    this.dd.clearActivePlots()
    this.commit('updateDatasets', this.dd)
  }
  setPlots(plots: Plots) {
    this.dd.setPlots(plots)
    this.commit('updateDatasets', this.dd)
  }
  toggleActivatedPlot(id: number) {
    this.dd.toggleActivatedPlot(id)
    this.commit('updateDatasets', this.dd)
  }
  activatePlot(id: number) {
    this.dd.activatePlot(id)
    this.commit('updateDatasets', this.dd)
  }
  setActiveDataset(id: number) {
    this.dd.setActiveDataset(id)
    this.commit('updateDatasets', this.dd)
  }
}

export const dataset = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const datasetMapper = createMapper(dataset)
