import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { AxisValInputHandlerInterface } from '../AxisValInputHandlerInterface'
import { AxisValInputHandler } from '../AxisValInputHandler'

export class AxisValInputHandlerManager extends InstanceManager<AxisValInputHandlerInterface> {
  private instanceCreator = () => {
    return new AxisValInputHandler()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
