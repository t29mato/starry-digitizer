import { AxisSetDTO } from './axisSetDTO'
import { DatasetDTO } from './datasetDTO'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { Point, Rect } from '@/@types/types'

// INFO: The single place that maps domain entities <-> DTOs. Shared by
// ProjectService (save/load) and HistoryManager (undo/redo snapshots) so the
// two can never drift apart.
//
// INFO: every conversion COPIES the nested coord objects and arrays instead of
// handing over the entity's own references. A DTO is a snapshot: a host that
// keeps the object returned by getProject() / received from `update:project`
// must not see it mutate as the user keeps digitising, and restoring from a
// host-owned DTO must not let the library write into the host's arrays.

export function toAxisSetDTO(axisSet: AxisSetInterface): AxisSetDTO {
  const dto: AxisSetDTO = {
    id: axisSet.id,
    name: axisSet.name,
    x1: {
      name: axisSet.x1.name,
      value: axisSet.x1.value,
      coord: { ...axisSet.x1.coord },
    },
    x2: {
      name: axisSet.x2.name,
      value: axisSet.x2.value,
      coord: { ...axisSet.x2.coord },
    },
    y1: {
      name: axisSet.y1.name,
      value: axisSet.y1.value,
      coord: { ...axisSet.y1.coord },
    },
    y2: {
      name: axisSet.y2.name,
      value: axisSet.y2.value,
      coord: { ...axisSet.y2.coord },
    },
    xIsLogScale: axisSet.xIsLogScale,
    yIsLogScale: axisSet.yIsLogScale,
    considerGraphTilt: axisSet.considerGraphTilt,
    pointMode: axisSet.pointMode,
    isVisible: axisSet.isVisible,
  }
  // INFO: the figure annotations (auto-extraction review, "5.") are written
  // only when set, like `externalId`: a project that never used them keeps
  // exactly the shape hosts already persist.
  if (axisSet.plotArea) {
    dto.plotArea = { ...axisSet.plotArea }
  }
  if (axisSet.legendArea) {
    dto.legendArea = { ...axisSet.legendArea }
  }
  return dto
}

export function fromAxisSetDTO(dto: AxisSetDTO): AxisSet {
  const axisSet = new AxisSet(
    // INFO: Axis stores the coord object as given, so copy it — a host's DTO
    // must not become live state, and vice versa.
    new Axis('x1', dto.x1.value, { ...dto.x1.coord }),
    new Axis('x2', dto.x2.value, { ...dto.x2.coord }),
    new Axis('y1', dto.y1.value, { ...dto.y1.coord }),
    new Axis('y2', dto.y2.value, { ...dto.y2.coord }),
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
  axisSet.plotArea = copyRect(dto.plotArea)
  axisSet.legendArea = copyRect(dto.legendArea)
  return axisSet
}

export function toDatasetDTO(dataset: DatasetInterface): DatasetDTO {
  const dto: DatasetDTO = {
    id: dataset.id,
    name: dataset.name,
    axisSetId: dataset.axisSetId,
    points: dataset.points.map(copyPoint),
    visiblePointIds: [...dataset.visiblePointIds],
    manuallyAddedPointIds: [...dataset.manuallyAddedPointIds],
  }
  if (dataset.externalId !== undefined) {
    dto.externalId = dataset.externalId
  }
  if (dataset.marker) {
    dto.marker = { ...dataset.marker }
  }
  if (dataset.scoreRemovedPoints.length > 0) {
    dto.scoreRemovedPoints = dataset.scoreRemovedPoints.map(copyPoint)
  }
  return dto
}

export function fromDatasetDTO(dto: DatasetDTO): Dataset {
  const dataset = new Dataset(
    dto.name,
    dto.points.map(copyPoint),
    dto.id,
  )
  dataset.axisSetId = dto.axisSetId
  dataset.visiblePointIds = [...dto.visiblePointIds]
  dataset.manuallyAddedPointIds = [...dto.manuallyAddedPointIds]
  dataset.externalId = dto.externalId
  dataset.marker = dto.marker ? { ...dto.marker } : undefined
  dataset.scoreRemovedPoints = (dto.scoreRemovedPoints ?? []).map(copyPoint)
  return dataset
}

// INFO: `origin` is the one nested object a point can carry (imported points
// only), so a spread alone would still share it between the DTO and the live
// point.
function copyPoint(point: Point): Point {
  const copy: Point = { ...point }
  if (point.origin) {
    copy.origin = { ...point.origin }
  }
  return copy
}

function copyRect(rect: Rect | null | undefined): Rect | null {
  return rect ? { ...rect } : null
}
