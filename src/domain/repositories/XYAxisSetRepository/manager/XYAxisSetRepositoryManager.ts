import { Axis } from '@/domain/models/axis/axis'
import { XYAxisSetRepository } from '../XYAxisSetRepository'
import { XYAxisSetRepositoryInterface } from '../XYAxisSetRepositoryInterface'
import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { RepositoryManagerInterface } from '../../repositoryManagerInterface'
import { XYAxisSet } from '@/domain/models/XYAxisSet/XYAxisSet'

export class XYAxisSetRepositoryManager
  extends InstanceManager<XYAxisSetRepositoryInterface>
  implements RepositoryManagerInterface<XYAxisSetRepositoryInterface>
{
  private instanceCreator = () => {
    return new XYAxisSetRepository(
      new XYAxisSet(
        new Axis('x1', 0),
        new Axis('x2', 1),
        new Axis('y1', 0),
        new Axis('y2', 1),
        new Axis('x2y2', -1),
        1,
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
