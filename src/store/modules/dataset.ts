import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Dataset, Datasets, Plot, Plots, Position } from '@/types'
import { DatasetManager as DD } from '@/domains/DatasetManager'
const dd = DD.instance

class state {
  activeScaledPlots: Plots = dd.activeScaledPlots
  activePlotIds: number[] = dd.activePlotIds
  activeDataset: Dataset = dd.activeDataset
  plotsAreActive: boolean = dd.plotsAreActive
  datasets: Datasets = dd.datasets
}

class getters extends Getters<state> {
  get activeScaledPlots() {
    return this.state.activeScaledPlots
  }
  get activePlotIds() {
    return this.state.activePlotIds
  }
  get activeDataset() {
    return this.state.activeDataset
  }
  get plotsAreActive() {
    return this.state.plotsAreActive
  }
  get datasets() {
    return this.state.datasets
  }
}

class mutations extends Mutations<state> {
  updateActiveScaledPlots(newPlots: Plots) {
    this.state.activeScaledPlots = newPlots
  }
  updateDatasets(newDatasets: Datasets) {
    this.state.datasets = newDatasets
  }
  updateActiveDataset(newDataset: Dataset) {
    this.state.activeDataset = newDataset
  }
  updateActivePlotsIds(ids: number[]) {
    this.state.activePlotIds = ids
  }
  updatePlotsAreActive(isActive: boolean) {
    this.state.plotsAreActive = isActive
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
    this.commit('updateActiveScaledPlots', this.dd.activeScaledPlots)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
    this.commit('updatePlotsAreActive', this.dd.plotsAreActive)
  }
  addDataset() {
    this.dd.addDataset()
    this.commit('updateDatasets', this.dd.datasets)
  }
  popDataset() {
    this.dd.popDataset()
    this.commit('updateActiveDataset', this.dd.activeDataset)
    this.commit('updateDatasets', this.dd.datasets)
  }
  moveActivePlot(arrow: string) {
    this.dd.moveActivePlot(arrow)
    this.commit('updateActiveDataset', this.dd.activeDataset)
  }
  clearPlots() {
    this.dd.clearPlots()
    this.commit('updateActiveDataset', this.dd.activeDataset)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
    this.commit('updateActiveScaledPlots', this.dd.activeScaledPlots)
  }
  clearActivePlots() {
    this.dd.clearActivePlots()
    this.commit('updateActiveDataset', this.dd.activeDataset)
    this.commit('updateActiveScaledPlots', this.dd.activeScaledPlots)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
  }
  setPlots(plots: Plots) {
    this.dd.setPlots(plots)
    this.commit('updateActiveDataset', this.dd.activeDataset)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
  }
  toggleActivatedPlot(id: number) {
    this.dd.toggleActivatedPlot(id)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
    this.commit('updatePlotsAreActive', this.dd.plotsAreActive)
  }
  activatePlot(id: number) {
    this.dd.activatePlot(id)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
    this.commit('updatePlotsAreActive', this.dd.plotsAreActive)
  }
  setActiveDataset(id: number) {
    this.dd.setActiveDataset(id)
    this.commit('updateActiveDataset', this.dd.activeDataset)
  }
}

export const dataset = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const datasetMapper = createMapper(dataset)
