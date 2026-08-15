import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { Confirmer, ConfirmerInterface } from '@plot-digitizer/core'

export class ConfirmerManager extends InstanceManager<ConfirmerInterface> {
  private instanceCreator = () => {
    return new Confirmer()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
