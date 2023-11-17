import { CurveInterpolator } from 'curve-interpolator'
import { InterpolatorInterface } from '@/domains/interpolatorInterfase'
import { Coord, Plot } from '@/domains/datasetInterface'

//MEMO: カーブの補間を司るドメイン
export class Interpolator implements InterpolatorInterface {
  getSplineInterpolatedCoords(plots: Plot[], numberOfCoords: number): Coord[] {
    const points = plots.map((plot) => [plot.xPx, plot.yPx])

    const interp = new CurveInterpolator(points, { tension: 0.2, alpha: 0.5 })

    return interp.getPoints(numberOfCoords)
  }
}
