import { Canvas } from '@/domains/canvas'
const cm = Canvas.instance

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

export class Dataset {
  name: string
  plots: Plots
  id: number
  constructor(dataset: Dataset) {
    this.name = dataset.name
    this.plots = dataset.plots
    this.id = dataset.id
  }
}

export class Datasets {
  static #instance: Datasets
  datasets: Dataset[] = [
    new Dataset({
      name: 'dataset 1',
      plots: [],
      id: 1,
    }),
  ]
  activeDatasetId = 1
  activePlotIds: number[] = []

  static get instance(): Datasets {
    if (!this.#instance) {
      this.#instance = new Datasets()
    }
    return this.#instance
  }

  async initialize() {}

  get activeDataset(): Dataset {
    const targetDataset = this.datasets.find((dataset) => {
      return dataset.id === this.activeDatasetId
    })
    if (!targetDataset) {
      throw new Error('There are no active datasets.')
    }
    return targetDataset
  }

  get activeScaledPlots(): Plots {
    const plots = this.activeDataset.plots.map((plot) => {
      return {
        id: plot.id,
        xPx: plot.xPx * cm.scale,
        yPx: plot.yPx * cm.scale,
      }
    })
    return plots
  }

  get nextPlotId(): number {
    if (this.activeDataset.plots.length === 0) {
      return 1
    }
    const biggestId = Math.max(
      ...this.activeDataset.plots.map((plot) => plot.id)
    )
    return biggestId + 1
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
    this.activeDataset.plots.push({
      id: this.nextPlotId,
      xPx,
      yPx,
    })
  }

  setPlots(plots: Plots) {
    this.activePlotIds = []
    this.activeDataset.plots = plots
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
    this.datasets.push({
      id: this.nextDatasetId,
      name: `dataset ${this.nextDatasetId}`,
      plots: [],
    })
  }
  popDataset() {
    if (this.datasets.length === 1) {
      return
    }
    this.datasets.pop()
  }

  moveActivePlot(arrow: string) {
    //  'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'ArrowLeft'
    switch (arrow) {
      case 'ArrowUp':
        this.activeDataset.plots
          .filter((plot) => this.activePlotIds.includes(plot.id))
          .map((plot) => plot.yPx--)
        break
      case 'ArrowRight':
        this.activeDataset.plots
          .filter((plot) => this.activePlotIds.includes(plot.id))
          .map((plot) => plot.xPx++)
        break
      case 'ArrowDown':
        this.activeDataset.plots
          .filter((plot) => this.activePlotIds.includes(plot.id))
          .map((plot) => plot.yPx++)
        break
      case 'ArrowLeft':
        this.activeDataset.plots
          .filter((plot) => this.activePlotIds.includes(plot.id))
          .map((plot) => plot.xPx--)
        break
      default:
        throw new Error('unknown arrow')
        break
    }
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

  clearPlots() {
    this.activeDataset.plots = []
    this.activePlotIds.length = 0
  }

  clearActivePlots() {
    this.activeDataset.plots = this.activeDataset.plots.filter((plot) => {
      return !this.activePlotIds.includes(plot.id)
    })
    this.activePlotIds.length = 0
  }
}
