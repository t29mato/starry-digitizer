import { CurveInterpolator } from 'curve-interpolator'
import { Coord, Plot } from '@/domain/models/dataset/datasetInterface'

export const getInterpolatedCoordsList = ({
  plots,
  segmentsList,
}: {
  plots: Plot[]
  segmentsList: number[]
}): Coord[][] => {
  const points = plots.map((plot) => [plot.xPx, plot.yPx])

  const interp = new CurveInterpolator(points, { tension: 0.2, alpha: 0.5 })

  return segmentsList.map((segments: number) => {
    return interp
      .getPoints(segments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))
  })
}
