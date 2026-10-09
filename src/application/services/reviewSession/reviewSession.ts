import { AutoExtractionDocumentDTO } from '@/application/dto/autoExtractionDTO'
import {
  diffReviewState,
  EditLogDetails,
  EditLogSummary,
  ReviewState,
} from '@/application/utils/editLogDiff'
import { AxisFit } from '@/domain/services/axisTickFitter'

export const EDIT_LOG_FORMAT = 'starry-digitizer/edit-log'
export const EDIT_LOG_VERSION = 1
// INFO: arrow keys move by 1px, so anything below that is float noise
export const DEFAULT_MOVE_TOLERANCE_PX = 0.5

export type ReviewEvent = { t_ms: number; action: string }

export type ReviewCalibration = {
  x: Pick<AxisFit, 'scale' | 'rmsResidualPx' | 'maxAbsResidualPx'> & {
    residuals: { value: number; px: number; residualPx: number }[]
  }
  y: Pick<AxisFit, 'scale' | 'rmsResidualPx' | 'maxAbsResidualPx'> & {
    residuals: { value: number; px: number; residualPx: number }[]
  }
}

// INFO: Persisted in ProjectDTO.reviewSession so a review survives
// save/reload of a project.
export type ReviewSessionDTO = {
  initialState: ReviewState
  source: Record<string, unknown> | null
  importedAt: string
  events: ReviewEvent[]
  calibration: ReviewCalibration | null
  warnings: string[]
}

export type EditLog = {
  format: typeof EDIT_LOG_FORMAT
  version: typeof EDIT_LOG_VERSION
  source: Record<string, unknown> | null
  imported_at: string
  exported_at: string
  elapsed_ms: number
  move_tolerance_px: number
  // INFO: the confidence-review threshold at export time (null if unknown)
  score_threshold: number | null
  summary: EditLogSummary & {
    events: { total: number; undo: number; redo: number }
  }
  details: EditLogDetails
  events: ReviewEvent[]
  final: AutoExtractionDocumentDTO
}

// INFO: State of an auto-extraction review (docs/design/
// auto-extraction-review-design.md): the imported initial state to diff
// against, plus a timestamped operation log fed by HistoryManager. Holds
// state only; building the current state from the repositories is the
// caller's job (autoExtractionOperations.ts), which keeps this testable.
export class ReviewSession {
  data: ReviewSessionDTO | null = null

  get isActive(): boolean {
    return this.data !== null
  }

  start(
    initialState: ReviewState,
    source: Record<string, unknown> | null,
    calibration: ReviewCalibration | null,
    warnings: string[],
    now: Date = new Date(),
  ): void {
    this.data = {
      // INFO: deep copy — the live Point objects are mutated in place by
      // edits, and the initial state must not follow them
      initialState: JSON.parse(JSON.stringify(initialState)),
      source,
      importedAt: now.toISOString(),
      events: [],
      calibration,
      warnings,
    }
  }

  clear(): void {
    this.data = null
  }

  record(action: string, now: Date = new Date()): void {
    if (!this.data) return
    this.data.events.push({
      t_ms: now.getTime() - Date.parse(this.data.importedAt),
      action,
    })
  }

  toDTO(): ReviewSessionDTO | null {
    return this.data ? JSON.parse(JSON.stringify(this.data)) : null
  }

  restore(dto: ReviewSessionDTO | null | undefined): void {
    this.data = dto ? JSON.parse(JSON.stringify(dto)) : null
  }

  diff(currentState: ReviewState, moveTolerancePx = DEFAULT_MOVE_TOLERANCE_PX) {
    if (!this.data) return null
    return diffReviewState(
      this.data.initialState,
      currentState,
      moveTolerancePx,
    )
  }

  buildEditLog(
    currentState: ReviewState,
    final: AutoExtractionDocumentDTO,
    now: Date = new Date(),
    moveTolerancePx = DEFAULT_MOVE_TOLERANCE_PX,
    scoreThreshold: number | null = null,
  ): EditLog | null {
    if (!this.data) return null
    const { summary, details } = diffReviewState(
      this.data.initialState,
      currentState,
      moveTolerancePx,
    )
    const events = this.data.events
    return {
      format: EDIT_LOG_FORMAT,
      version: EDIT_LOG_VERSION,
      source: this.data.source,
      imported_at: this.data.importedAt,
      exported_at: now.toISOString(),
      elapsed_ms: now.getTime() - Date.parse(this.data.importedAt),
      move_tolerance_px: moveTolerancePx,
      score_threshold: scoreThreshold,
      summary: {
        ...summary,
        events: {
          total: events.length,
          undo: events.filter((e) => e.action === 'undo').length,
          redo: events.filter((e) => e.action === 'redo').length,
        },
      },
      details,
      events: [...events],
      final,
    }
  }
}
