import { InstanceManager } from '@/general/instanceManager/instanceManager'
import {
  Extractor,
  ExtractorInterface,
  LineExtract,
} from '@plot-digitizer/core'

export class ExtractorManager extends InstanceManager<ExtractorInterface> {
  private instanceCreator = () => {
    return new Extractor(LineExtract.instance)
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
