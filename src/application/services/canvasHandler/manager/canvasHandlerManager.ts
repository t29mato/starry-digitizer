import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { CanvasHandlerInterface } from '../canvasHandlerInterface'
import { CanvasHandler } from '../canvasHandler'

export class CanvasHandlerManager extends InstanceManager<CanvasHandlerInterface> {
  private instanceCreator = () => {
    return new CanvasHandler()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
