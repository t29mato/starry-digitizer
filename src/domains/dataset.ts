import { Vector } from './axes/axesInterface'
import { DatasetInterface, Plots } from './datasetInterface'

export class Dataset implements DatasetInterface {
  name: string
  plots: Plots
  id: number
  activePlotIds: number[] = []
  visiblePlotIds: number[] = []
  manuallyAddedPlotIds: number[] = []
  plotsAreAdjusting = false
  constructor(name: string, plots: Plots, id: number) {
    this.name = name
    this.plots = plots
    this.id = id
  }

  scaledPlots(scale: number): Plots {
    return this.plots.map((plot) => {
      return {
        id: plot.id,
        xPx: plot.xPx * scale,
        yPx: plot.yPx * scale,
      }
    })
  }

  get plotsAreActive(): boolean {
    return this.activePlotIds.length > 0
  }

  addPlot(xPx: number, yPx: number) {
    this.activePlotIds.length = 0
    this.activePlotIds.push(this.nextPlotId)
    this.visiblePlotIds.push(this.nextPlotId)
    this.plots.push({
      id: this.nextPlotId,
      xPx,
      yPx,
    })
  }

  get nextPlotId(): number {
    if (this.plots.length === 0) {
      return 1
    }
    const biggestId = Math.max(...this.plots.map((plot) => plot.id))
    return biggestId + 1
  }

  get lastPlotId(): number {
    const lastPlot = this.plots[this.plots.length - 1]

    if (!lastPlot) return -1

    return lastPlot.id
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
    this.plots = this.plots.filter((plot) => {
      return id !== plot.id
    })
    this.activePlotIds.length = 0

    this.removeVisiblePlotId(id)
    this.removeManuallyAddedPlotId(id)
  }

  clearPlots() {
    this.plots = []
    this.activePlotIds.length = 0
  }

  inactivatePlots() {
    this.activePlotIds = []
  }

  clearActivePlots() {
    this.plots = this.plots.filter((plot) => {
      return !this.activePlotIds.includes(plot.id)
    })
    this.activePlotIds.length = 0
  }

  hasActive(): boolean {
    return this.activePlotIds.length > 0
  }

  moveActivePlot(vector: Vector) {
    const ids = this.activePlotIds
    this.plotsAreAdjusting = true
    switch (vector.direction) {
      case 'up':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => (plot.yPx -= vector.distancePx))
        break
      case 'right':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => (plot.xPx += vector.distancePx))
        break
      case 'down':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => (plot.yPx += vector.distancePx))
        break
      case 'left':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => (plot.xPx -= vector.distancePx))
        break
    }
  }

  addVisiblePlotId(id: number): void {
    if (this.visiblePlotIds.includes(id)) return
    this.visiblePlotIds.push(id)
  }

  removeVisiblePlotId(id: number): void {
    this.visiblePlotIds = this.visiblePlotIds.filter((pId) => pId !== id)
  }

  addManuallyAddedPlotId(id: number): void {
    if (this.manuallyAddedPlotIds.includes(id)) return
    this.manuallyAddedPlotIds.push(id)
  }

  removeManuallyAddedPlotId(id: number): void {
    this.manuallyAddedPlotIds = this.manuallyAddedPlotIds.filter(
      (pId) => pId !== id,
    )
  }

  clearManuallyAddedPlotIdss(): void {
    this.manuallyAddedPlotIds.length = 0
  }

  plotsSortedByXAscending(): Plots {
    return this.plots.sort((a, b) => {
      return a.xPx - b.xPx
    })
  }

  plotsSortedByXDescending(): Plots {
    return this.plots.sort((a, b) => {
      return b.xPx - a.xPx
    })
  }

  plotsSortedByYAscending(): Plots {
    return this.plots.sort((a, b) => {
      return a.yPx - b.yPx
    })
  }

  plotsSortedByYDescending(): Plots {
    return this.plots.sort((a, b) => {
      return b.yPx - a.yPx
    })
  }

  plotsSortedByIdAscending(): Plots {
    return this.plots.sort((a, b) => {
      return a.id - b.id
    })
  }

  plotsSortedByIdDescending(): Plots {
    return this.plots.sort((a, b) => {
      return b.id - a.id
    })
  }
}
