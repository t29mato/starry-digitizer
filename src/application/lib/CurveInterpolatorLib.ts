import { CurveInterpolator } from 'curve-interpolator'
import { Coord, Point } from '@/domain/models/dataset/datasetInterface'

export const getInterpolatedCoordsList = ({
  points,
  segmentsList,
}: {
  points: Point[]
  segmentsList: number[]
}): Coord[][] => {
  const pointsConvertedToArr = points.map((point) => [point.xPx, point.yPx])

  const interp = new CurveInterpolator(pointsConvertedToArr, {
    tension: 0.2,
    alpha: 0.5,
  })

  return segmentsList.map((segments: number) => {
    return interp
      .getPoints(segments)
      .map((p: number[]) => ({ xPx: p[0], yPx: p[1] }))
  })
}
