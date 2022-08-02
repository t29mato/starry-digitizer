import { Datasets, Dataset, Plots } from '@/types'
import { CanvasManager as CM } from '@/domains/CanvasManager'
import { AxesManager as AM } from '@/domains/AxesManager'
import XYAxesCalculator from '../XYAxesCalculator'
const cm = CM.instance
const am = AM.instance

export class DatasetManager {
  static #instance: DatasetManager
  #datasets: Datasets = [
    {
      id: 1,
      name: 'dataset 1',
      plots: [],
    },
  ]
  activeDatasetId = 1
  activePlotIds: number[] = []

  static get instance(): DatasetManager {
    if (!this.#instance) {
      this.#instance = new DatasetManager()
    }
    return this.#instance
  }

  get datasets(): Datasets {
    return this.#datasets
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
        xPx: plot.xPx * cm.canvasScale,
        yPx: plot.yPx * cm.canvasScale,
      }
    })
    return plots
  }

  get activeCalculatedPlots(): Plots {
    const newPlots = this.activeDataset.plots.map((plot) => {
      const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
      return {
        id: plot.id,
        xPx: plot.xPx,
        yPx: plot.yPx,
        xV,
        yV,
      }
    })
    return newPlots
  }

  get nextPlotId(): number {
    if (this.activeDataset.plots.length === 0) {
      return 1
    }
    return this.activeDataset.plots[this.activeDataset.plots.length - 1].id + 1
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

  calculateXY(x: number, y: number): { xV: string; yV: string } {
    // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
    if (!am.validateAxes()) {
      return { xV: '0', yV: '0' }
    }
    const calculator = new XYAxesCalculator(
      {
        x1: am.axes.x1,
        x2: am.axes.x2,
        y1: am.axes.y1,
        y2: am.axes.y2,
      },
      {
        x: am.xIsLog,
        y: am.yIsLog,
      }
    )
    return calculator.calculateXYValues(x, y)
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
    this.activePlotIds.length = 0
    this.activeDataset.plots = plots
  }

  // HACK: Vue instance cannot detect the CanvasManager scale change.
  refreshPlots() {
    this.activeDataset.plots.push({
      id: this.nextPlotId,
      xPx: 0,
      yPx: 0,
    })
    this.activeDataset.plots.pop()
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
