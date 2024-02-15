import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { ExtractorInterface } from '../extractorInterface'
import { Extractor } from '../extractor'
import LineExtract from '@/application/strategies/extractStrategies/lineExtract'

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
