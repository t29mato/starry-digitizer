import { Axis } from '@/domain/models/axis/axis'
import { AxisSetRepository } from '../AxisSetRepository'
import { AxisSetRepositoryInterface } from '../AxisSetRepositoryInterface'
import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { RepositoryManagerInterface } from '../../repositoryManagerInterface'
import { AxisSet } from '@/domain/models/AxisSet/AxisSet'

export class AxisSetRepositoryManager
  extends InstanceManager<AxisSetRepositoryInterface>
  implements RepositoryManagerInterface<AxisSetRepositoryInterface>
{
  private instanceCreator = () => {
    return new AxisSetRepository(
      new AxisSet(
        new Axis('x1', 0),
        new Axis('x2', 1),
        new Axis('y1', 0),
        new Axis('y2', 1),
        new Axis('x2y2', -1),
        1,
        'XY Axes 1',
      ),
    )
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
