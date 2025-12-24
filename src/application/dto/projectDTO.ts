import { AxisSetDTO } from './axisSetDTO'
import { DatasetDTO } from './datasetDTO'
import { CanvasHandlerDTO } from './canvasHandlerDTO'

/**
 * DTO (Data Transfer Object) for Project
 * Complete project data for serialization and deserialization
 * This represents the entire application state that can be saved/loaded
 */
export interface ProjectDTO {
  version: string
  timestamp: string
  axisSets: AxisSetDTO[]
  activeAxisSetId: number
  datasets: DatasetDTO[]
  activeDatasetId: number
  canvasHandler: CanvasHandlerDTO
}
