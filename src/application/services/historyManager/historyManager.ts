import {
  HistoryChange,
  HistoryChangeListener,
  HistoryChangeType,
  HistoryManagerInterface,
} from './historyManagerInterface'
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
  // INFO: the notification lives HERE, not at the call sites, because
  // `capture()` is called from several layers — the dataset use cases
  // (application/utils/datasetOperations.ts) and CanvasMain.vue alike — and a
  // host must not have to know which. Anything that moves the stacks reports
  // it, whoever asked.
  private listeners: HistoryChangeListener[] = []

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
    this.notify('capture')
  }

  undo(): void {
    if (!this.canUndo) {
      return
    }
    const previous = this.undoStack.pop() as HistorySnapshot
    this.redoStack.push(this.buildSnapshot())
    this.restore(previous)
    this.notify('undo')
  }

  redo(): void {
    if (!this.canRedo) {
      return
    }
    const next = this.redoStack.pop() as HistorySnapshot
    this.undoStack.push(this.buildSnapshot())
    this.restore(next)
    this.notify('redo')
  }

  clear(): void {
    // INFO: `loadProject()` / `reset()` clear on every mount and every project
    // load, usually with nothing on the stacks. Staying quiet then keeps the
    // rule a host can rely on: a notification means the undo/redo state
    // actually changed.
    const hadHistory = this.canUndo || this.canRedo
    this.undoStack = []
    this.redoStack = []
    if (hadHistory) {
      this.notify('clear')
    }
  }

  subscribe(listener: HistoryChangeListener): () => void {
    this.listeners.push(listener)
    let subscribed = true
    return () => {
      if (!subscribed) {
        return
      }
      subscribed = false
      const index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // INFO: called AFTER the stacks have moved (and after restore()), so a
  // listener sees the state it is being told about rather than a half-applied
  // one. The payload is read-only data with nothing to write back, and it says
  // WHICH call moved the stacks, so a host driving a shared undo stack can
  // ignore the 'undo'/'redo' it caused itself instead of treating it as a new
  // user action — that is the loop this design has to avoid.
  private notify(type: HistoryChangeType): void {
    if (this.listeners.length === 0) {
      return
    }
    const change: HistoryChange = {
      type,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
    }
    // INFO: iterate a copy — a listener may unsubscribe itself (or another)
    // while we are delivering.
    this.listeners.slice().forEach((listener) => {
      try {
        listener(change)
      } catch (error) {
        // INFO: a host's bookkeeping must never break the user's undo.
        console.error('[starry-digitizer] history listener failed', error)
      }
    })
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
