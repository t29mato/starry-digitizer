import { Coord, Plots } from './datasetInterface'

export interface InterpolatorInterface {
  interval: number
  interpolatedCoords: Coord[]

  updateInterval(interval: number): void
  setSplineInterpolatedCoords(plots: Plots): void
}
