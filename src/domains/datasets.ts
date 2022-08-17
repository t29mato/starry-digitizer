import { Dataset } from './dataset'
import { DatasetInterface } from './datasetInterface'

export type Position = {
  xPx: number
  yPx: number
}
export type Plot = {
  id: number
  xPx: number
  yPx: number
}

export type Plots = Plot[]

export class Datasets {
  datasets: DatasetInterface[]
  activeDatasetId = 1
  activePlotIds: number[] = []

  constructor(dataset: DatasetInterface) {
    this.datasets = [dataset]
  }

  async initialize() {}

  get activeDataset(): DatasetInterface {
    const targetDataset = this.datasets.find((dataset) => {
      return dataset.id === this.activeDatasetId
    })
    if (!targetDataset) {
      throw new Error('There are no active datasets.')
    }
    return targetDataset
  }

  activeScaledPlots(scale: number): Plots {
    return this.activeDataset.scaledPlots(scale)
  }

  get nextPlotId(): number {
    return this.activeDataset.nextPlotId
  }

  get plotsAreActive(): boolean {
    return this.activePlotIds.length > 0
  }

  get nextDatasetId(): number {
    if (this.datasets.length === 0) {
      return 1
    }
    return this.datasets[this.datasets.length - 1].id + 1
  }

  addPlot(xPx: number, yPx: number) {
    this.activePlotIds.length = 0
    this.activePlotIds.push(this.nextPlotId)
    this.activeDataset.addPlot(xPx, yPx)
  }

  setPlots(plots: Plots) {
    this.activeDataset.plots = plots
  }

  sortPlots() {
    this.activeDataset.plots.sort((a, b) => {
      return a.xPx - b.xPx
    })
  }

  setActiveDataset(id: number) {
    this.activeDatasetId = id
  }

  editDatasetName(datasetId: number, newName: string) {
    const targetDataset = this.datasets.find((dataset) => {
      return dataset.id === datasetId
    })
    if (!targetDataset) {
      throw new Error(datasetId + "doesn't exist.")
    }
    targetDataset.name = newName
  }

  addDataset() {
    this.datasets.push(
      new Dataset(`dataset ${this.nextDatasetId}`, [], this.nextDatasetId)
    )
  }
  popDataset() {
    if (this.datasets.length === 1) {
      return
    }
    if (this.datasets[this.datasets.length - 1].id === this.activeDatasetId) {
      this.setActiveDataset(this.datasets[this.datasets.length - 2].id)
    }
    this.datasets.pop()
  }

  moveActivePlot(arrow: string) {
    this.activeDataset.moveActivePlot(this.activePlotIds, arrow)
  }

  activatePlot(id: number) {
    this.activePlotIds.length = 0
    this.activePlotIds.push(id)
  }

  toggleActivatedPlot(toggledId: number) {
    if (this.activePlotIds.includes(toggledId)) {
      const activePlotIds = this.activePlotIds.filter((id) => {
        return id !== toggledId
      })
      this.activePlotIds.length = 0
      this.activePlotIds.push(...activePlotIds)
      return
    }
    this.activePlotIds.push(toggledId)
  }

  clearPlot(id: number) {
    this.activeDataset.plots = this.activeDataset.plots.filter((plot) => {
      return id !== plot.id
    })
    this.activePlotIds.length = 0
  }

  clearPlots() {
    this.activeDataset.plots = []
    this.activePlotIds.length = 0
  }

  cancelActivePlots() {
    this.activePlotIds = []
  }

  clearActivePlots() {
    this.activeDataset.plots = this.activeDataset.plots.filter((plot) => {
      return !this.activePlotIds.includes(plot.id)
    })
    this.activePlotIds.length = 0
  }
}
