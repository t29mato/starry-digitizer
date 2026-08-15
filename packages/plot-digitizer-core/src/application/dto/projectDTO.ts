import type { AxisSetDTO } from './axisSetDTO'
import type { DatasetDTO } from './datasetDTO'
import type { CanvasStateDTO } from './canvasStateDTO'

/**
 * DTO (Data Transfer Object) for Project
 * Complete project data for serialization and deserialization
 * This represents the entire application state that can be saved/loaded
 *
 * INFO: the `canvasHandler` field name is kept as-is (rather than
 * `canvasState`) for backward file-format compatibility — existing
 * `project.json` files exported by starry-digitizer already use this key.
 */
export interface ProjectDTO {
  version: string
  timestamp: string
  axisSets: AxisSetDTO[]
  activeAxisSetId: number
  datasets: DatasetDTO[]
  activeDatasetId: number
  canvasHandler: CanvasStateDTO
}
