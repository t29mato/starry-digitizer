import { CurveInterpolator } from 'curve-interpolator'
import { InterpolatorInterface } from '@/domains/interpolatorInterfase'
import { Coord, Plot, Plots } from '@/domains/datasetInterface'

//MEMO: カーブの補間を司るドメイン
export class Interpolator implements InterpolatorInterface {
  interval: number = 10
  interpolatedCoords: Coord[] = []

  updateInterval(interval: number): void {
    this.interval = interval
  }

  setSplineInterpolatedCoords(plots: Plots): void {
    const points = plots.map((plot) => [plot.xPx, plot.yPx])

    const interp = new CurveInterpolator(points, { tension: 0.2, alpha: 0.5 })

    const segments = Math.max(
      Math.floor(
        this.getPlotsTotalDistance(plots) / (this.interval * 1.6), //INFO: intervalが10の時、点同士の間隔がおよそ16pxになるようにした比例式
      ),
      1,
    )

    console.log(segments)

    this.interpolatedCoords = interp
      .getPoints(segments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))
  }

  //TODO: interpolatorドメインに属しているのは不適切だと思うので、あとでしかるべきところに移管する
  getPlotsTotalDistance(plots: Plot[]): number {
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
}
