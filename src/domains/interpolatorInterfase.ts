import { Coord, Plot } from './datasetInterface'

export interface InterpolatorInterface {
  // interpolatedCoords: Coord[]

  getSplineInterpolatedCoords(plots: Plot[], numberOfCoords: number): Coord[]
}
