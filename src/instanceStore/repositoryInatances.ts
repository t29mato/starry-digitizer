import { AxisSetRepositoryManager } from '@/domain/repositories/AxisSetRepository/manager/AxisSetRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

export const datasetRepository = new DatasetRepositoryManager().getInstance()
export const axisSetRepository = new AxisSetRepositoryManager().getInstance()
