import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Dataset, Plot, Plots, Position } from '@/types'
import { DatasetManager as dd } from '@/domains/DatasetManager'

class state {
  activeScaledPlots: Plots = dd.instance.activeScaledPlots
  activePlotIds: number[] = dd.instance.activePlotIds
  activeDataset: Dataset = dd.instance.activeDataset
  plotsAreActive: boolean = dd.instance.plotsAreActive
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
}

class mutations extends Mutations<state> {
  updateActiveScaledPlots(newPlots: Plots) {
    this.state.activeScaledPlots = newPlots
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
    this.dd = dd.instance
  }

  addPlot(plot: Position) {
    this.dd.addPlot(plot.xPx, plot.yPx)
    this.commit('updateActiveScaledPlots', this.dd.activeScaledPlots)
    this.commit('updateActivePlotsIds', this.dd.activePlotIds)
    this.commit('updatePlotsAreActive', this.dd.plotsAreActive)
  }
  addDataset() {
    this.dd.addDataset()
    this.commit('updateActiveDataset', this.dd.activeDataset)
  }
  popDataset() {
    this.dd.popDataset()
    this.commit('updateActiveDataset', this.dd.activeDataset)
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
}

export const dataset = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const datasetMapper = createMapper(dataset)
