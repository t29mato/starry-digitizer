import { Plot } from '@/domains/datasetInterface'

//TODO: public interfaceの、Plots型の、getTotalDistanceとして定義する
export function getPlotsTotalDistance(plots: Plot[]): number {
  let previousPlot: undefined | Plot = undefined
  let totalDistance: number = 0

  plots.forEach((plot) => {
    if (previousPlot === undefined) {
      previousPlot = plot
      return
    }

    const xDiff = plot.xPx - previousPlot.xPx
    const yDiff = plot.yPx - previousPlot.yPx

    totalDistance += Math.sqrt(xDiff * xDiff + yDiff * yDiff)

    previousPlot = plot
  })

  return totalDistance
}
