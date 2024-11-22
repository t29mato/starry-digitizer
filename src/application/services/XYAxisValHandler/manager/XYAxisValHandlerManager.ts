import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { XYInputHandlerInterface } from '../XYInputHandlerInterface'
import { XYAxisValHandler } from '../XYAxisValHandler'

export class XYInputHandlerManager extends InstanceManager<XYInputHandlerInterface> {
  private instanceCreator = () => {
    return new XYAxisValHandler()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
