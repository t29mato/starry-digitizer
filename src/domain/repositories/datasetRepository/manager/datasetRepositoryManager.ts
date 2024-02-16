import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetRepository } from '@/domain/repositories/datasetRepository/datasetRepository'
import { InstanceManager } from '@/general/instanceManager/instanceManager'
import { RepositoryManagerInterface } from '../../repositoryManagerInterface'

export class DatasetRepositoryManager
  extends InstanceManager<DatasetRepository>
  implements RepositoryManagerInterface<DatasetRepository>
{
  private instanceCreator = () => {
    return new DatasetRepository(new Dataset('dataset 1', [], 1))
  }

  public getInstance() {
    return super.getInstance(this.instanceCreator)
  }

  public getNewInstance() {
    return super.getNewInstance(this.instanceCreator)
  }
}
