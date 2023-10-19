import { Vector } from './axes/axesInterface'
import { DatasetInterface, Plots, Plot, Coord } from './datasetInterface'

export class Dataset implements DatasetInterface {
  name: string
  plots: Plots
  id: number
  activePlotIds: number[] = []
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
