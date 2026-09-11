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

/**
 * What was selected when the snapshot was taken.
 *
 * INFO: this block is the reason a snapshot is NOT a ProjectDTO. Selection is
 * session state, not project data: `DatasetDTO` has no `activePointIds` and
 * `AxisSetDTO` no `activeAxisName`, and adding either would change the shape
 * hosts persist — a MAJOR bump of PROJECT_DTO_VERSION — for something nobody
 * wants restored when a saved file is reopened. So the snapshot keeps the DTO
 * arrays exactly as ProjectService writes them and carries the selection
 * ALONGSIDE them, keyed by the id of the dataset / axis set it belongs to.
 * Nothing in this file is ever handed to ProjectService, so the extra block
 * cannot leak into a saved project.
 *
 * WHY it is captured at all: `capture()` happens BEFORE a mutation, so undo
 * used to land the user on the right points with nothing selected — the next
 * arrow key did nothing and the "undo, then keep nudging" loop broke. The
 * selection has to come back with the coordinates it belongs to.
 */
interface HistorySelection {
  /** dataset id → the point ids that were active in it */
  activePointIds: Record<number, number[]>
  /** axis set id → the axis being nudged (absent/'' when none was) */
  activeAxisNames: Record<number, string>
}

// INFO: Only axisSets/datasets (plus which of their parts were selected) are
// captured; canvas zoom/mode and the uploaded image are intentionally out of
// scope (see docs/design/ux-ideas-implementation-design.md for rationale).
interface HistorySnapshot {
  axisSets: AxisSetDTO[]
  activeAxisSetId: number
  datasets: DatasetDTO[]
  activeDatasetId: number
  selection: HistorySelection
}

// INFO: x2y2 is the virtual "move x2 and y2 together" axis. It is derived at
// runtime and deliberately NOT part of AxisSetDTO, so `fromAxisSetDTO()`
// rebuilds it at the (-999, -999) sentinel. Restoring a selection that names
// it would leave the arrow keys pointed at that sentinel and drag x2/y2 along
// with it, so it is the one axis name a snapshot refuses to bring back — same
// rule as a point id the snapshot does not carry.
const UNRESTORABLE_AXIS_NAME = 'x2y2'

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
    const selection: HistorySelection = {
      activePointIds: {},
      activeAxisNames: {},
    }
    this.datasetRepository.datasets.forEach((dataset) => {
      // INFO: every dataset's selection, not just the active one — switching
      // datasets is itself undoable, and coming back to a dataset with its
      // selection wiped is the same broken loop one level up.
      selection.activePointIds[dataset.id] = [...dataset.activePointIds]
    })
    this.axisSetRepository.axisSets.forEach((axisSet) => {
      selection.activeAxisNames[axisSet.id] = axisSet.activeAxisName
    })

    const snapshot: HistorySnapshot = {
      axisSets: this.axisSetRepository.axisSets.map(toAxisSetDTO),
      activeAxisSetId: this.axisSetRepository.activeAxisSetId,
      datasets: this.datasetRepository.datasets.map(toDatasetDTO),
      activeDatasetId: this.datasetRepository.activeDataset.id,
      selection,
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
    snapshot.axisSets.forEach((dto) => {
      const axisSet = fromAxisSetDTO(dto)
      const axisName = snapshot.selection.activeAxisNames[dto.id]
      if (axisName && axisName !== UNRESTORABLE_AXIS_NAME) {
        // INFO: activateAxisByName() ignores anything that is not an axis
        // name, so a garbled snapshot leaves the axis set unselected rather
        // than pointed at nothing.
        axisSet.activateAxisByName(axisName)
      }
      this.axisSetRepository.addAxisSet(axisSet)
    })
    this.axisSetRepository.setActiveAxisSet(snapshot.activeAxisSetId)

    this.datasetRepository.clearAllDatasets()
    snapshot.datasets.forEach((dto) => {
      const dataset = fromDatasetDTO(dto)
      dataset.activePointIds = this.restorableActivePointIds(snapshot, dto)
      this.datasetRepository.addDataset(dataset)
    })
    this.datasetRepository.setActiveDataset(snapshot.activeDatasetId)
  }

  /**
   * The selected point ids of one dataset, minus the ones the snapshot has no
   * point for.
   *
   * INFO: a selection is only ever meaningful together with the points it
   * names. Undo restores the point layout wholesale, so an id that layout does
   * not contain — a point added after the capture, an id a host's own call
   * order left behind — must be dropped here rather than handed to the
   * domain: `moveActivePoint()` and the point overlay both filter by id and
   * would silently do nothing, while `clearActivePoints()` would report a
   * deletion that removed nothing. Dropping is also why this cannot throw:
   * undo has to land somewhere usable even if the selection is nonsense.
   */
  private restorableActivePointIds(
    snapshot: HistorySnapshot,
    dto: DatasetDTO,
  ): number[] {
    const activePointIds = snapshot.selection.activePointIds[dto.id]
    if (!activePointIds) {
      return []
    }
    const pointIds = new Set(dto.points.map((point) => point.id))
    return activePointIds.filter((id) => pointIds.has(id))
  }
}
