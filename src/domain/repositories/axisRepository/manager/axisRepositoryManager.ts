import { Axis } from '@/domain/models/axis/axis'
import { AxisRepository } from '../axisRepository'
import { AxisRepositoryInterface } from '../axisRepositoryInterface'

export class AxisRepositoryManager {
  private static instance: AxisRepositoryInterface

  //INFO: Always return the same instance
  public static getInstance() {
    if (!this.instance) {
      this.instance = new AxisRepository(
        new Axis('x1', 0),
        new Axis('x2', 1),
        new Axis('y1', 0),
        new Axis('y2', 1),
        new Axis('x2y2', -1),
      )
    }

    return this.instance
  }

  //INFO: Create new instance for unit test
  public static getNewInstance() {
    return new AxisRepository(
      new Axis('x1', 0),
      new Axis('x2', 1),
      new Axis('y1', 0),
      new Axis('y2', 1),
      new Axis('x2y2', -1),
    )
  }
}
