import { Coord, Plot, Plots } from './datasetInterface'

export interface InterpolatorInterface {
  interval: number
  interpolatedCoords: Coord[]

  updateInterval(interval: number): void
  setSplineInterpolatedCoords(plots: Plots): void
  //TODO: interpolatorドメインに属しているのは不適切だと思うので、あとでしかるべきところに移管する
  getPlotsTotalDistance(plots: Plot[]): number
}
