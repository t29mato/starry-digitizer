import { CurveInterpolator } from 'curve-interpolator'
import { InterpolatorInterface } from '@/domains/interpolatorInterfase'
import { Coord, Plots } from '@/domains/datasetInterface'
import { getPlotsTotalDistance } from '../services/getPlotsTotalDistance'

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

    const totalDistance = getPlotsTotalDistance(plots)
    const intervalScaled = this.interval * 1.6
    const segments = Math.floor(totalDistance / intervalScaled)

    this.interpolatedCoords = interp
      .getPoints(segments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))
  }
}
