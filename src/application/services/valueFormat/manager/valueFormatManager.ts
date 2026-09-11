import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { ValueFormatInterface } from '../valueFormatInterface'
import { ValueFormat } from '../valueFormat'

export class ValueFormatManager extends InstanceManager<ValueFormatInterface> {
  private instanceCreator = () => {
    return new ValueFormat()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
