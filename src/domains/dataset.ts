import { Vector } from './axes/axesInterface'
import { DatasetInterface, Plots, Plot, Coord } from './datasetInterface'

export class Dataset implements DatasetInterface {
  name: string
  plots: Plots
  id: number
  tempPlots: Plots = []
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

  scaledTempPlots(scale: number): Plots {
    return this.tempPlots.map((plot) => {
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

  switchActivatedPlot(id: number) {
    this.activePlotIds.length = 0
    this.activePlotIds.push(id)
  }

  addActivatedPlot(id: number) {
    this.activePlotIds.push(id)
  }

  //INFO クリックされたplotがactiveな場合はinactiveにし、そうでない場合はactive状態に追加する
  toggleActivatedPlot(toggledId: number) {
    if (this.activePlotIds.includes(toggledId)) {
      const activePlotIds = this.activePlotIds.filter((id) => {
        return id !== toggledId
      })
      this.activePlotIds.length = 0
      this.activePlotIds.push(...activePlotIds)
      return
    }

    this.addActivatedPlot(toggledId)
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
    this.plots.forEach((plot) => this.clearPlot(plot.id))
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

  addTempPlot(xPx: number, yPx: number) {
    this.tempPlots.push({
      id: this.nextTempPlotId,
      xPx,
      yPx,
    })
  }

  get nextTempPlotId(): number {
    if (this.tempPlots.length === 0) {
      return 1
    }
    const biggestId = Math.max(...this.tempPlots.map((plot) => plot.id))
    return biggestId + 1
  }

  clearTempPlot(id: number) {
    this.tempPlots = this.tempPlots.filter((tempPlot) => tempPlot.id !== id)
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

  get manuallyAddedPlots(): Plots {
    return this.plots.filter((plot) =>
      this.manuallyAddedPlotIds.includes(plot.id),
    )
  }

  activatePlotsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord) {
    this.inactivatePlots()

    const plotsToActivate = this.plotsInRectangleArea(
      topLeftCoord,
      bottomRightCoord,
    )
    plotsToActivate.forEach((plot: Plot) => {
      this.addActivatedPlot(plot.id)
    })
  }

  moveTempPlotToPlot(tempPlotId: number): void {
    const tempPlot = this.tempPlots.find(
      (tempPlot) => tempPlot.id === tempPlotId,
    )

    if (!tempPlot) return

    this.addPlot(tempPlot.xPx, tempPlot.yPx)
    this.clearTempPlot(tempPlotId)
  }

  plotsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord): Plots {
    return this.plots.filter((plot: Plot) => {
      return (
        plot.xPx >= topLeftCoord.xPx &&
        plot.xPx <= bottomRightCoord.xPx &&
        plot.yPx >= topLeftCoord.yPx &&
        plot.yPx <= bottomRightCoord.yPx
      )
    })
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
