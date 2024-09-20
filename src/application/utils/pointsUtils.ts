//TODO Re-consider where to place this logic: should move to domain repo with Points repository??

import { Point } from '@/@types/types'

export function getPointsTotalDistance(points: Point[]): number {
  let previousPoint: undefined | Point = undefined
  let totalDistance: number = 0

  points.forEach((point) => {
    if (previousPoint === undefined) {
      previousPoint = point
      return
    }

    const xDiff = point.xPx - previousPoint.xPx
    const yDiff = point.yPx - previousPoint.yPx

    totalDistance += Math.sqrt(xDiff * xDiff + yDiff * yDiff)

    previousPoint = point
  })

  return totalDistance
}
