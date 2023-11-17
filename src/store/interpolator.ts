import { defineStore } from 'pinia'
import { Interpolator } from '@/domains/interpolator'

export interface State {
  interpolator: Interpolator
}

export const useInterpolatorStore = defineStore('interpolator', {
  state: (): State => ({
    interpolator: new Interpolator(),
  }),
  actions: {
    setDensity(density: number): void {
      this.interpolator.density = density
    },
  },
})
