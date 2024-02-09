import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

export const datasetRepository = new DatasetRepositoryManager().getInstance()
export const axisRepository = new AxisRepositoryManager().getInstance()
