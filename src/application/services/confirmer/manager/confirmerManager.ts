import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { ConfirmerInterface } from '../confirmerInterface'
import { Confirmer } from '../confirmer'

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
