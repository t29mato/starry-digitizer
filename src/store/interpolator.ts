import { defineStore } from 'pinia'
import { Interpolator } from '@/domains/interpolator'
import { Plot } from '@/domains/datasetInterface'

export interface State {
  interpolator: Interpolator
}

export const useInterpolatorStore = defineStore('interpolator', {
  state: (): State => ({
    interpolator: new Interpolator(),
  }),
  actions: {
    setSplineInterpolatedCoords(plots: Plot[]): void {
      this.interpolator.setSplineInterpolatedCoords(plots)
    },
    //TODO: interpolatorドメインに属しているのは不適切だと思うので、あとでしかるべきところに移管する
    getPlotsTotalDistance(plots: Plot[]): number {
      return this.interpolator.getPlotsTotalDistance(plots)
    },
    setDensity(density: number): void {
      this.interpolator.density = density
    },
  },
})
