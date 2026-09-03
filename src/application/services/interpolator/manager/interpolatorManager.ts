import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { InterpolatorInterface } from '../interpolatorInterface'
import { Interpolator } from '../interpolator'
import { InterpolatorCanvas } from '@/presentation/dom/InterpolatorCanvas'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'

export class InterpolatorManager extends InstanceManager<InterpolatorInterface> {
  constructor(
    private datasetRepository: DatasetRepositoryInterface,
    private canvasHandler: CanvasHandlerInterface,
  ) {
    super()
  }

  private instanceCreator = () => {
    return new Interpolator(
      new InterpolatorCanvas(),
      this.datasetRepository,
      this.canvasHandler,
    )
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
