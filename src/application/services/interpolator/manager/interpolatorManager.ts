import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { InterpolatorInterface } from '../interpolatorInterface'
import { Interpolator } from '../interpolator'

export class InterpolatorManager extends InstanceManager<InterpolatorInterface> {
  private instanceCreator = () => {
    return new Interpolator()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
