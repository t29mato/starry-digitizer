import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { RepositoryManagerInterface } from '../../repositoryManagerInterface'
import { DatasetRepositoryInterface } from '../datasetRepositoryInterface'

export class DatasetRepositoryManager
  extends InstanceManager<DatasetRepositoryInterface>
  implements RepositoryManagerInterface<DatasetRepositoryInterface>
{
  private instanceCreator = () => {
    return new DatasetRepository()
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
