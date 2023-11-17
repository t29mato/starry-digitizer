import { defineStore } from 'pinia'
import { Interpolator } from '@/domains/interpolator'
import { Coord, Plot } from '@/domains/datasetInterface'

export interface State {
  interpolator: Interpolator
}

export const useInterpolatorStore = defineStore('magnifier', {
  state: (): State => ({
    interpolator: new Interpolator(),
  }),
  actions: {
    getSplineInterpolatedCoords(
      plots: Plot[],
      numberOfCoords: number,
    ): Coord[] {
      return this.interpolator.getSplineInterpolatedCoords(
        plots,
        numberOfCoords,
      )
    },
  },
})
