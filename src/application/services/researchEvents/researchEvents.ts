import { EditLogSummary } from '@/application/utils/editLogDiff'
import type { ExtractionMethod } from '@/application/services/autoService/autoService'

// INFO: Research record as a HOST HOOK (Starrydata2 v4 board P4,
// docs/design/auto-service.md §9). The digitizer never sends these anywhere
// itself: it only hands them to a listener the host gives it, and with no
// listener (the default) nothing is built at all. Whether, where and with
// what consent the host stores them is the host's business.
//
// WHAT AN EVENT MAY CARRY: names of operations, counts, scores and times —
// nothing else. No image data or URLs, no point/axis coordinates or values,
// no dataset names (they may be sample names typed by the user), no
// `source` block of an imported document, no user or host identifiers.
// Every payload below is built from numbers and fixed strings only, so a new
// event type that wants to carry more must change this file — and the
// review of that change is where the line is held.

export const RESEARCH_EVENT_FORMAT = 'starry-digitizer/research-event'
export const RESEARCH_EVENT_VERSION = 1

/** Fields every research event has. */
export interface ResearchEventBase {
  format: typeof RESEARCH_EVENT_FORMAT
  version: typeof RESEARCH_EVENT_VERSION
  /** 1, 2, 3, … per digitizer instance (per DigitizerContext) */
  seq: number
  /** when it happened (ISO 8601, UTC) */
  at: string
  /**
   * ms since the auto-extraction review in progress was imported (the same
   * clock as the edit log's `events[].t_ms`), or null outside a review
   */
  review_t_ms: number | null
}

/** An undoable edit — one `HistoryManager.capture(action)`. */
export interface ResearchEditEvent extends ResearchEventBase {
  type: 'edit'
  /**
   * the action name given to capture(): 'point.add', 'point.move',
   * 'point.delete', 'axis.auto-place', 'extract.server', 'extract.auto',
   * 'points.remove-below-score', 'points.resample', 'points.trace', …
   * ('edit' when the caller named none)
   */
  action: string
}

export interface ResearchUndoEvent extends ResearchEventBase {
  type: 'undo'
}

export interface ResearchRedoEvent extends ResearchEventBase {
  type: 'redo'
}

/** An auto-extraction document was imported and a review started. */
export interface ResearchReviewStartEvent extends ResearchEventBase {
  type: 'review.start'
  /** series (datasets) imported */
  series: number
  /** points imported */
  points: number
  /** import warnings (count only; the texts are not passed on) */
  warnings: number
}

/**
 * Review Points: the user stepped to the next (`direction: 1`, `N`) or
 * previous (`-1`, `Shift+N`) low-confidence point.
 */
export interface ResearchReviewStepEvent extends ResearchEventBase {
  type: 'review.step'
  direction: 1 | -1
  /** false when there was no point below the threshold to go to */
  found: boolean
  /** score of the point stepped to, null when none / unscored */
  score: number | null
  /** the confidence threshold in use */
  threshold: number
}

/** An edit log was built (exported) for the review in progress. */
export interface ResearchReviewExportEvent extends ResearchEventBase {
  type: 'review.export'
  /** the edit log's `elapsed_ms` */
  elapsed_ms: number
  /** the edit log's `summary` (counts only — no coordinates) */
  summary: EditLogSummary & {
    events: { total: number; undo: number; redo: number }
  }
}

/** The review was ended (its imported state and log discarded). */
export interface ResearchReviewEndEvent extends ResearchEventBase {
  type: 'review.end'
}

/**
 * An Auto-place answer was applied to the axes (Axis Auto-place's Apply, or
 * the first half of Auto digitize — see `action`). A summary of the answer
 * only: whether each axis was read, its scale, how many ticks, the engine's
 * confidence. Where the markers went is the host's to read from the
 * context, if it wants to (the event itself carries no coordinates).
 */
export interface ResearchAutoPlaceApplyEvent extends ResearchEventBase {
  type: 'auto_place.apply'
  /** the undo step's name: 'axis.auto-place' or 'auto.digitize' */
  action: string
  /** the axes that were applied */
  axes: ('x' | 'y')[]
  /** the answer's overall status */
  status: 'ok' | 'partial' | 'failed'
  x: ResearchAutoAxisSummary
  y: ResearchAutoAxisSummary
}

export interface ResearchAutoAxisSummary {
  ok: boolean
  scale: 'linear' | 'log' | null
  ticks: number
  confidence: number | null
  /** the backend's failure code (a fixed identifier), or null */
  failure: string | null
}

/**
 * Server Extraction results became draft datasets (the Extract button, or
 * the second half of Auto digitize — see `source`).
 */
export interface ResearchExtractionApplyEvent extends ResearchEventBase {
  type: 'extraction.apply'
  method: ExtractionMethod
  source: 'extract' | 'auto_digitize'
  /** the undo step's name, null when it joined Auto digitize's step */
  action: string | null
  series: number
  points: number
  /** the digitizer's ids of the draft datasets, in series order */
  datasets: number[]
  /** untouched drafts of an earlier Extract that were replaced */
  replaced: number
}

/** An Auto digitize run ended (any outcome). */
export interface ResearchAutoDigitizeEndEvent extends ResearchEventBase {
  type: 'auto_digitize.end'
  method: ExtractionMethod
  status: 'done' | 'no_points' | 'stopped' | 'failed' | 'cancelled'
  /** the step the run ended at without finishing; null when done */
  stopped_at: 'axes' | 'extract' | null
  applied_axes: ('x' | 'y')[]
  series: number
  points: number
  undo_steps: number
}

/**
 * Data left the digitizer (a copy to the clipboard, a project file, a JSON
 * download). What kind and how much — never the values.
 */
export interface ResearchExportEvent extends ResearchEventBase {
  type: 'export'
  /** 'copy', 'project', 'json', 'edit_log', … */
  kind: string
  /** 'dataset' (one dataset), 'all' or 'project' */
  scope: string
  datasets: number
  points: number
}

export type ResearchEvent =
  | ResearchEditEvent
  | ResearchUndoEvent
  | ResearchRedoEvent
  | ResearchReviewStartEvent
  | ResearchReviewStepEvent
  | ResearchReviewExportEvent
  | ResearchReviewEndEvent
  | ResearchAutoPlaceApplyEvent
  | ResearchExtractionApplyEvent
  | ResearchAutoDigitizeEndEvent
  | ResearchExportEvent

export type ResearchEventType = ResearchEvent['type']

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** What a caller of `emit` supplies; the base fields are filled in. */
export type ResearchEventPayload = DistributiveOmit<
  ResearchEvent,
  keyof ResearchEventBase
>

export type ResearchEventListener = (event: ResearchEvent) => void

// INFO: what DigitizerContext exposes. An interface rather than the class,
// because a class with private members stops matching itself once Vue's
// UnwrapNestedRefs has mapped the context type (App.vue's appContext).
export interface ResearchEventsInterface {
  readonly isEnabled: boolean
  setListener(listener: ResearchEventListener | null | undefined): void
  emit(payload: ResearchEventPayload | (() => ResearchEventPayload)): void
}

export class ResearchEvents implements ResearchEventsInterface {
  private listener: ResearchEventListener | null = null
  private seq = 0

  /**
   * @param reviewImportedAt when the review in progress was imported (ISO),
   * or null — read at emit time
   */
  constructor(
    private readonly reviewImportedAt: () => string | null = () => null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** true only while a host listener is set */
  get isEnabled(): boolean {
    return this.listener !== null
  }

  /** Set (or with null / undefined, remove) the host's listener. */
  setListener(listener: ResearchEventListener | null | undefined): void {
    this.listener = listener ?? null
  }

  /**
   * Hand an event to the host's listener. Does nothing without one.
   * `payload` may also be a function, so a caller can skip building it (e.g.
   * an edit-log summary) when nobody listens.
   */
  emit(payload: ResearchEventPayload | (() => ResearchEventPayload)): void {
    const listener = this.listener
    if (!listener) return
    const body = typeof payload === 'function' ? payload() : payload
    const now = this.now()
    const importedAt = this.reviewImportedAt()
    this.seq += 1
    // INFO: a deep, frozen copy — the listener must not get (or be able to
    // change) anything live, and a host keeping the object later sees what
    // was true when it was emitted
    const event = deepFreeze(
      JSON.parse(
        JSON.stringify({
          ...body,
          format: RESEARCH_EVENT_FORMAT,
          version: RESEARCH_EVENT_VERSION,
          seq: this.seq,
          at: now.toISOString(),
          review_t_ms:
            importedAt === null ? null : now.getTime() - Date.parse(importedAt),
        }),
      ),
    ) as ResearchEvent
    try {
      listener(event)
    } catch (error) {
      // INFO: the host's record keeping must never break the user's editing
      console.error('[starry-digitizer] research event listener failed', error)
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
