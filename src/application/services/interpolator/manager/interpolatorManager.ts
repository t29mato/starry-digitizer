import { Interpolator } from '../interpolator'
import { InterpolatorInterface } from '../interpolatorInterface'

export class InterpolatorManager {
  private static instance: InterpolatorInterface

  //INFO: Always return the same instance
  public static getInstance() {
    if (!this.instance) {
      this.instance = new Interpolator()
    }

    return this.instance
  }

  //INFO: Create new instance for unit test
  public static getNewInstance() {
    return new Interpolator()
  }
}
