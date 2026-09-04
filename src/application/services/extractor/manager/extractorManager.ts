import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { ExtractorInterface } from '../extractorInterface'
import { Extractor } from '../extractor'

export class ExtractorManager extends InstanceManager<ExtractorInterface> {
  // INFO: no strategy is passed in any more — the extractor creates its own
  // (see Extractor's constructor), so every instance owns its extraction
  // settings instead of sharing a module-level singleton.
  private instanceCreator = () => {
    return new Extractor()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
