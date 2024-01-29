import { Dataset } from '../../../models/dataset/dataset'
import { DatasetRepository } from '../datasetRepository'
import { DatasetRepositoryInterface } from '../datasetRepositoryInterface'

export class DatasetRepositoryManager {
  private static instance: DatasetRepositoryInterface

  //INFO: Always return the same instance
  public static getInstance() {
    if (!this.instance) {
      this.instance = new DatasetRepository(new Dataset('dataset 1', [], 1))
    }

    return this.instance
  }

  //INFO: Create new instance for unit test
  public static getNewInstance() {
    return new DatasetRepository(new Dataset('dataset 1', [], 1))
  }
}
