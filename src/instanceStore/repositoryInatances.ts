import { XYAxisSetRepositoryManager } from '@/domain/repositories/XYAxisSetRepository/manager/XYAxisSetRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

export const datasetRepository = new DatasetRepositoryManager().getInstance()
export const XYAxisSetRepository =
  new XYAxisSetRepositoryManager().getInstance()
