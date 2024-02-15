import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { MagnifierInterface } from '../magnifierInterface'
import { Magnifier } from '../magnifier'

export class MagnifierManager extends InstanceManager<MagnifierInterface> {
  private instanceCreator = () => {
    return new Magnifier()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
