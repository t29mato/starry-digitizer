import { Axis } from '@/domain/models/axis/axis'
import { AxisRepository } from '../axisRepository'
import { AxisRepositoryInterface } from '../axisRepositoryInterface'
import { InstanceManager } from '@/general/instanceManager/instanceManager'

export class AxisRepositoryManager extends InstanceManager<AxisRepositoryInterface> {
  private instanceCreator = () => {
    return new AxisRepository(
      new Axis('x1', 0),
      new Axis('x2', 1),
      new Axis('y1', 0),
      new Axis('y2', 1),
      new Axis('x2y2', -1),
    )
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
