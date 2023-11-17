import { Coord, Plot } from './datasetInterface'

export interface InterpolatorInterface {
  interpolatedCoords: Coord[]
  density: number

  setSplineInterpolatedCoords(plots: Plot[]): void
  //TODO: interpolatorドメインに属しているのは不適切だと思うので、あとでしかるべきところに移管する
  getPlotsTotalDistance(plots: Plot[]): number
}
