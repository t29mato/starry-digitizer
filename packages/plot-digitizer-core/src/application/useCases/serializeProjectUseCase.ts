import { Axis } from '../../domain/models/axis/axis'
import { AxisSet } from '../../domain/models/axisSet/axisSet'
import { Dataset } from '../../domain/models/dataset/dataset'
import type { AxisSetInterface } from '../../domain/models/axisSet/axisSetInterface'
import type { DatasetInterface } from '../../domain/models/dataset/datasetInterface'
import type { AxisSetDTO } from '../dto/axisSetDTO'
import type { DatasetDTO } from '../dto/datasetDTO'
import type { CanvasStateDTO } from '../dto/canvasStateDTO'
import type { ProjectDTO } from '../dto/projectDTO'

export interface ToProjectDTOParams {
  version: string
  axisSets: AxisSetInterface[]
  activeAxisSetId: number
  datasets: DatasetInterface[]
  activeDatasetId: number
  canvasState: CanvasStateDTO
}

export interface FromProjectDTOResult {
  axisSets: AxisSet[]
  activeAxisSetId: number
  datasets: Dataset[]
  activeDatasetId: number
  canvasState: CanvasStateDTO
}

// INFO: Phase 3 (docs/design/plot-digitizer-architecture.md). Ported from
// the DTO-assembly/restoration logic that used to live inline in the host
// app's ProjectService.exportProject()/loadProject(). ZIP packaging,
// File/Blob handling, and the "grab the uploaded image" fallback stay in
// the app's ProjectService — this use case only ever sees/returns plain
// data (domain instances + DTOs), never touches JSZip, File, Blob, or the
// DOM.
export class SerializeProjectUseCase {
  toProjectDTO(params: ToProjectDTOParams): ProjectDTO {
    return {
      version: params.version,
      timestamp: new Date().toISOString(),
      axisSets: params.axisSets.map(toAxisSetDTO),
      activeAxisSetId: params.activeAxisSetId,
      datasets: params.datasets.map(toDatasetDTO),
      activeDatasetId: params.activeDatasetId,
      canvasHandler: params.canvasState,
    }
  }

  fromProjectDTO(dto: ProjectDTO): FromProjectDTOResult {
    return {
      axisSets: dto.axisSets.map(fromAxisSetDTO),
      activeAxisSetId: dto.activeAxisSetId,
      datasets: dto.datasets.map(fromDatasetDTO),
      activeDatasetId: dto.activeDatasetId,
      canvasState: dto.canvasHandler,
    }
  }
}

function toAxisSetDTO(axisSet: AxisSetInterface): AxisSetDTO {
  return {
    id: axisSet.id,
    name: axisSet.name,
    // Extract AxisDTO from AxisInterface (Entity)
    x1: {
      name: axisSet.x1.name,
      value: axisSet.x1.value,
      coord: axisSet.x1.coord,
    },
    x2: {
      name: axisSet.x2.name,
      value: axisSet.x2.value,
      coord: axisSet.x2.coord,
    },
    y1: {
      name: axisSet.y1.name,
      value: axisSet.y1.value,
      coord: axisSet.y1.coord,
    },
    y2: {
      name: axisSet.y2.name,
      value: axisSet.y2.value,
      coord: axisSet.y2.coord,
    },
    xIsLogScale: axisSet.xIsLogScale,
    yIsLogScale: axisSet.yIsLogScale,
    considerGraphTilt: axisSet.considerGraphTilt,
    pointMode: axisSet.pointMode,
    isVisible: axisSet.isVisible,
  }
}

function fromAxisSetDTO(dto: AxisSetDTO): AxisSet {
  const axisSet = new AxisSet(
    new Axis('x1', dto.x1.value, dto.x1.coord),
    new Axis('x2', dto.x2.value, dto.x2.coord),
    new Axis('y1', dto.y1.value, dto.y1.coord),
    new Axis('y2', dto.y2.value, dto.y2.coord),
    // INFO: x2y2 is a virtual axis derived at runtime, not persisted —
    // always reset it rather than restoring it from the DTO.
    new Axis('x2y2', -1, { xPx: -999, yPx: -999 }),
    dto.id,
    dto.name,
  )
  axisSet.xIsLogScale = dto.xIsLogScale
  axisSet.yIsLogScale = dto.yIsLogScale
  axisSet.considerGraphTilt = dto.considerGraphTilt
  axisSet.pointMode = dto.pointMode
  axisSet.isVisible = dto.isVisible
  return axisSet
}

function toDatasetDTO(dataset: DatasetInterface): DatasetDTO {
  return {
    id: dataset.id,
    name: dataset.name,
    axisSetId: dataset.axisSetId,
    points: dataset.points,
    visiblePointIds: dataset.visiblePointIds,
    manuallyAddedPointIds: dataset.manuallyAddedPointIds,
  }
}

function fromDatasetDTO(dto: DatasetDTO): Dataset {
  const dataset = new Dataset(dto.name, dto.points, dto.id)
  dataset.axisSetId = dto.axisSetId
  dataset.visiblePointIds = dto.visiblePointIds
  dataset.manuallyAddedPointIds = dto.manuallyAddedPointIds
  return dataset
}
