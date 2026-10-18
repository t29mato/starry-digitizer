import {
  TRACE_LIMITS,
  TraceSampling,
  TraceStop,
} from '@/application/utils/curveTrace'

/** What the last Trace Curve click did, for the status line. */
export interface CurveTraceOutcome {
  /** points added to the active dataset (0 when nothing was traced) */
  added: number
  /** why each end stopped, left end first */
  stops: [TraceStop, TraceStop] | null
  /** the colour followed, as #rrggbb */
  colorHex: string | null
  lengthPx: number
  error?: string
}

/**
 * The Trace Curve tool's settings (per digitizer instance) and the outcome
 * of its last click. View state only: not saved with the project and not
 * part of the undo snapshot.
 *
 * The colour distance is NOT here on purpose: tracing uses the extractor's
 * `colorDistancePct`, the same "colour distance" Automatic Extraction uses,
 * so there is one setting for "how close is the same colour".
 */
export class CurveTraceSettings {
  /** longest gap (px) jumped along the curve (dashes, a curve drawn over it) */
  maxGapPx = 10
  /** a point every N px … */
  spacingPx = 10
  /** … along the path, or at each multiple of N px in x */
  sampling: TraceSampling = 'path'
  /** follow the colour under the click, or the Color Settings colour */
  colorSource: 'click' | 'picker' = 'click'
  lastOutcome: CurveTraceOutcome | null = null

  setMaxGapPx(value: number): void {
    if (!Number.isFinite(value)) return
    this.maxGapPx = Math.min(
      TRACE_LIMITS.maxGapPx,
      Math.max(0, Math.round(value)),
    )
  }

  setSpacingPx(value: number): void {
    if (!Number.isFinite(value)) return
    this.spacingPx = Math.min(
      TRACE_LIMITS.maxSpacingPx,
      Math.max(TRACE_LIMITS.minSpacingPx, value),
    )
  }

  setSampling(value: TraceSampling): void {
    this.sampling = value === 'x' ? 'x' : 'path'
  }

  setColorSource(value: 'click' | 'picker'): void {
    this.colorSource = value === 'picker' ? 'picker' : 'click'
  }

  setLastOutcome(outcome: CurveTraceOutcome | null): void {
    this.lastOutcome = outcome
  }
}
