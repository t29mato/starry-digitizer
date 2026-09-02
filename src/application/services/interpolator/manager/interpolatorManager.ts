import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { InterpolatorInterface } from '../interpolatorInterface'
import { Interpolator } from '../interpolator'
import { InterpolatorCanvas } from '@/presentation/dom/InterpolatorCanvas'

export class InterpolatorManager extends InstanceManager<InterpolatorInterface> {
  private instanceCreator = () => {
    return new Interpolator(new InterpolatorCanvas())
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
