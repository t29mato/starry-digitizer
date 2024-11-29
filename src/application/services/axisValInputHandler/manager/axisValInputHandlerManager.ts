import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { AxisSetRepositoryManager } from '@/domain/repositories/axisSetRepository/manager/axisSetRepositoryManager'
import { AxisValInputHandler } from '../axisValInputHandler'
import { AxisValInputHandlerInterface } from '../axisValInputHandlerInterface'

export class AxisValInputHandlerManager extends InstanceManager<AxisValInputHandlerInterface> {
  private instanceCreator = () => {
    return new AxisValInputHandler(
      new AxisSetRepositoryManager().getNewInstance(),
    )
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
