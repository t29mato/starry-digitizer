import { HistoryManagerInterface } from './historyManagerInterface'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { AxisSetDTO } from '@/application/dto/axisSetDTO'
import { DatasetDTO } from '@/application/dto/datasetDTO'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

// INFO: How many undo steps we keep around. Bounded so a long editing
// session doesn't grow the snapshot stack without limit.
const MAX_HISTORY_SIZE = 50

// INFO: Only axisSets/datasets are captured; canvas zoom/mode and the
// uploaded image are intentionally out of scope (see docs/design/
// ux-ideas-implementation-design.md for rationale).
interface HistorySnapshot {
  axisSets: AxisSetDTO[]
  activeAxisSetId: number
  datasets: DatasetDTO[]
  activeDatasetId: number
}

// INFO: docs/design/ux-ideas-implementation-design.md — snapshot-based
// undo/redo built on top of the same AxisSet/Dataset ⇄ DTO conversion
// ProjectService.exportProject()/loadProject() uses (kept in sync manually
// since plot-digitizer-core is not used by this app).
export class HistoryManager implements HistoryManagerInterface {
  private undoStack: HistorySnapshot[] = []
  private redoStack: HistorySnapshot[] = []

  constructor(
    private axisSetRepository: AxisSetRepositoryInterface,
    private datasetRepository: DatasetRepositoryInterface,
  ) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  capture(): void {
    this.undoStack.push(this.buildSnapshot())
    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(): void {
    if (!this.canUndo) {
      return
    }
    const previous = this.undoStack.pop() as HistorySnapshot
    this.redoStack.push(this.buildSnapshot())
    this.restore(previous)
  }

  redo(): void {
    if (!this.canRedo) {
      return
    }
    const next = this.redoStack.pop() as HistorySnapshot
    this.undoStack.push(this.buildSnapshot())
    this.restore(next)
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  private buildSnapshot(): HistorySnapshot {
    const snapshot: HistorySnapshot = {
      axisSets: this.axisSetRepository.axisSets.map(toAxisSetDTO),
      activeAxisSetId: this.axisSetRepository.activeAxisSetId,
      datasets: this.datasetRepository.datasets.map(toDatasetDTO),
      activeDatasetId: this.datasetRepository.activeDataset.id,
    }
    // INFO: points/etc. in the DTOs are the very same array instances as
    // the live entities'. Without cloning here, a later mutation
    // (addPoint, moveActivePoint, ...) would silently corrupt snapshots
    // already sitting on the stack. JSON round-trip is a cheap, sufficient
    // deep-clone since the snapshot is plain data.
    return JSON.parse(JSON.stringify(snapshot))
  }

  private restore(snapshot: HistorySnapshot): void {
    this.axisSetRepository.clearAllAxisSets()
    snapshot.axisSets.forEach((dto) =>
      this.axisSetRepository.addAxisSet(fromAxisSetDTO(dto)),
    )
    this.axisSetRepository.setActiveAxisSet(snapshot.activeAxisSetId)

    this.datasetRepository.clearAllDatasets()
    snapshot.datasets.forEach((dto) =>
      this.datasetRepository.addDataset(fromDatasetDTO(dto)),
    )
    this.datasetRepository.setActiveDataset(snapshot.activeDatasetId)
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
