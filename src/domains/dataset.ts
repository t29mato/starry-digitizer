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

export class Dataset implements DatasetInterface {
  name: string
  plots: Plots
  id: number
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

  get nextPlotId(): number {
    if (this.plots.length === 0) {
      return 1
    }
    const biggestId = Math.max(...this.plots.map((plot) => plot.id))
    return biggestId + 1
  }

  addPlot(xPx: number, yPx: number) {
    this.plots.push({
      id: this.nextPlotId,
      xPx,
      yPx,
    })
  }

  moveActivePlot(ids: number[], arrow: string) {
    //  'ArrowUp' | 'ArrowRight' | 'ArrowDown' | 'ArrowLeft'
    switch (arrow) {
      case 'ArrowUp':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => plot.yPx--)
        break
      case 'ArrowRight':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => plot.xPx++)
        break
      case 'ArrowDown':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => plot.yPx++)
        break
      case 'ArrowLeft':
        this.plots
          .filter((plot) => ids.includes(plot.id))
          .map((plot) => plot.xPx--)
        break
      default:
        throw new Error('unknown arrow')
        break
    }
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
