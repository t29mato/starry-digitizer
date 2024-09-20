import { AxisSetRepository } from '../axisSetRepository'
import { AxisSetRepositoryInterface } from '../axisSetRepositoryInterface'
import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { RepositoryManagerInterface } from '../../repositoryManagerInterface'
import { AxisSet } from '@/domain/models/axisSet/axisSet'

export class AxisSetRepositoryManager
  extends InstanceManager<AxisSetRepositoryInterface>
  implements RepositoryManagerInterface<AxisSetRepositoryInterface>
{
  private instanceCreator = () => {
    return new AxisSetRepository()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
