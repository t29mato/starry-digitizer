import { CurveInterpolator } from 'curve-interpolator'
import { InterpolatorInterface } from '@/domains/interpolatorInterfase'
import { Coord, Plots } from '@/domains/datasetInterface'
import { getPlotsTotalDistance } from '../services/getPlotsTotalDistance'

//MEMO: カーブの補間を司るドメイン
export class Interpolator implements InterpolatorInterface {
  interval: number = 10
  interpolatedCoords: Coord[] = []
  interpolatedCoordsForGuideline: Coord[] = [] //TODO 設計改修時にこれの保管場所も見直す

  updateInterval(interval: number): void {
    this.interval = interval
  }

  setSplineInterpolatedCoords(plots: Plots): void {
    const points = plots.map((plot) => [plot.xPx, plot.yPx])

    // TODO: Make it independent of CurveInterpolator.
    const interp = new CurveInterpolator(points, { tension: 0.2, alpha: 0.5 })

    const manualPlotsTotalDistance = getPlotsTotalDistance(plots)

    const segments = Math.max(
      Math.floor(
        manualPlotsTotalDistance / (this.interval * Math.sqrt(2)), //INFO: intervalが10の時、点同士の間隔がおよそ16pxになるようにした比例式
      ),
      1,
    )

    this.interpolatedCoords = interp
      .getPoints(segments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))

    const guidelineSegments = Math.max(
      Math.floor(manualPlotsTotalDistance / 4), //INFO: 補助線は常に高精度の曲線にする
      1,
    )

    this.interpolatedCoordsForGuideline = interp
      .getPoints(guidelineSegments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))
  }

  cleatInterpolatedCoords(): void {
    this.interpolatedCoords = []
  }
}
