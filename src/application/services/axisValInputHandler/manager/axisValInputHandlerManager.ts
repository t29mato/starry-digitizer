import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { AxisValInputHandler } from '../axisValInputHandler'
import { AxisValInputHandlerInterface } from '../axisValInputHandlerInterface'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'

export class AxisValInputHandlerManager extends InstanceManager<AxisValInputHandlerInterface> {
  private instanceCreator = () => {
    return new AxisValInputHandler(axisSetRepository)
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
