import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { NotifierInterface } from '../notifierInterface'
import { Notifier } from '../notifier'

export class NotifierManager extends InstanceManager<NotifierInterface> {
  private instanceCreator = () => {
    return new Notifier()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
