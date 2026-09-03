import { HistoryManagerInterface } from './historyManagerInterface'
import { AxisSetRepositoryInterface } from '@/domain/repositories/axisSetRepository/axisSetRepositoryInterface'
import { DatasetRepositoryInterface } from '@/domain/repositories/datasetRepository/datasetRepositoryInterface'
import { AxisSetDTO } from '@/application/dto/axisSetDTO'
import { DatasetDTO } from '@/application/dto/datasetDTO'
import {
  toAxisSetDTO,
  fromAxisSetDTO,
  toDatasetDTO,
  fromDatasetDTO,
} from '@/application/dto/converters'

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
// ProjectService uses (shared via application/dto/converters.ts).
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
