import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { XYAxisValHandlerInterface } from '../XYAxisValHandlerInterface'
import { XYAxisValHandler } from '../XYAxisValHandler'

export class XYAxisValHandlerManager extends InstanceManager<XYAxisValHandlerInterface> {
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
