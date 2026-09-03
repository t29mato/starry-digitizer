import { AxisSetDTO } from './axisSetDTO'
import { DatasetDTO } from './datasetDTO'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

// INFO: The single place that maps domain entities <-> DTOs. Shared by
// ProjectService (save/load) and HistoryManager (undo/redo snapshots) so the
// two can never drift apart.

export function toAxisSetDTO(axisSet: AxisSetInterface): AxisSetDTO {
  return {
    id: axisSet.id,
    name: axisSet.name,
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

export function fromAxisSetDTO(dto: AxisSetDTO): AxisSet {
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

export function toDatasetDTO(dataset: DatasetInterface): DatasetDTO {
  const dto: DatasetDTO = {
    id: dataset.id,
    name: dataset.name,
    axisSetId: dataset.axisSetId,
    points: dataset.points,
    visiblePointIds: dataset.visiblePointIds,
    manuallyAddedPointIds: dataset.manuallyAddedPointIds,
  }
  if (dataset.externalId !== undefined) {
    dto.externalId = dataset.externalId
  }
  return dto
}

export function fromDatasetDTO(dto: DatasetDTO): Dataset {
  const dataset = new Dataset(dto.name, dto.points, dto.id)
  dataset.axisSetId = dto.axisSetId
  dataset.visiblePointIds = dto.visiblePointIds
  dataset.manuallyAddedPointIds = dto.manuallyAddedPointIds
  dataset.externalId = dto.externalId
  return dataset
}
