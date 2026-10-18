import { DigitizerContext } from '@/application/digitizerContext'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  AutoAxisName,
  AutoCalibrationProposal,
} from '@/application/services/autoService/autoServiceWire'
import {
  applyAutoCalibration,
  describeAxisFailure,
  requestAutoCalibration,
} from '@/application/utils/autoCalibrationOperations'
import {
  applyServerExtractionDrafts,
  requestServerExtraction,
} from '@/application/utils/serverExtractionOperations'
import { isImageChangedError } from '@/application/utils/autoFeatureOperations'
import { DigitizerError } from '@/application/errors'

// INFO: Auto digitize — one button for "Auto-place the axes, apply them,
// then Server Extraction with the method the person chose". It is the two
// existing operations (autoCalibrationOperations / serverExtractionOperations)
// run back to back; nothing here talks to the service on its own.
//
// The method is the person's choice (Lines = LineFormer, Markers =
// MarkerNet). There is no fallback from one to the other: when the chosen
// method fails or finds nothing, the run says so and stops.
//
// UNDO: the whole run is ONE undo step, 'auto.digitize'. The axes are
// applied (and captured) as soon as the calibration is in, so the person sees
// them while the extraction runs; the drafts then go into that same step
// without a capture of their own. If the undo history moved in between
// (the person edited something, or pressed Undo, while waiting) the drafts
// cannot honestly belong to that step any more, so they get their own
// ('extract.server') and the outcome says it took two.
//
// A run that fails part-way leaves what it finished (the axes) and reports
// the step it stopped at; Undo once still goes back to before the run.

/** The steps of a run, in order. */
export type AutoDigitizeStep = 'axes' | 'extract'

export type AutoDigitizeStatus =
  /** axes applied and drafts made */
  | 'done'
  /** axes applied; the method found nothing */
  | 'no_points'
  /** the calibration was not good enough to apply; nothing changed */
  | 'stopped'
  /** the service failed (or the feature is not available) */
  | 'failed'
  /** aborted, or the image changed while a request was in flight */
  | 'cancelled'

/** Below this an axis is not applied without a person looking at it. */
export const MIN_AUTO_DIGITIZE_AXIS_CONFIDENCE = 0.5

export interface AutoDigitizeOptions {
  method: ExtractionMethod
  /** extraction parameters; omitted = the backend's defaults */
  params?: Record<string, number>
  /** cancels the run; whatever was applied before stays (one undo step) */
  signal?: AbortSignal
  /** called when a step starts, for a progress line */
  onStep?: (step: AutoDigitizeStep) => void
  /** default MIN_AUTO_DIGITIZE_AXIS_CONFIDENCE */
  minAxisConfidence?: number
}

export interface AutoDigitizeExtraction {
  seriesCount: number
  pointCount: number
  datasetIds: number[]
  replacedDraftCount: number
  /** true when some point carries a score (MarkerNet): Review Points applies */
  hasScores: boolean
}

export interface AutoDigitizeOutcome {
  status: AutoDigitizeStatus
  method: ExtractionMethod
  /** the step the run ended at without finishing; null when done */
  stoppedAt: AutoDigitizeStep | null
  /** what went wrong, in words; '' when done */
  reason: string
  /** the service error, for status 'failed' */
  error: DigitizerError | null
  /** the axes the run applied (empty when it stopped before) */
  appliedAxes: AutoAxisName[]
  /** the calibration answer, when one came back */
  proposal: AutoCalibrationProposal | null
  extraction: AutoDigitizeExtraction | null
  /** how many undo steps the run added: 0, 1, or 2 (see UNDO above) */
  undoSteps: number
}

export const AUTO_DIGITIZE_ACTION = 'auto.digitize'

/**
 * Why `proposal` should not be applied without a person looking at it, or
 * null when both axes are usable.
 */
export function autoDigitizeAxesProblem(
  proposal: AutoCalibrationProposal,
  minConfidence = MIN_AUTO_DIGITIZE_AXIS_CONFIDENCE,
): string | null {
  const problems: string[] = []
  for (const name of ['x', 'y'] as const) {
    const axis = proposal[name]
    if (!axis.ok) {
      problems.push(`${name} axis: ${describeAxisFailure(axis.failureReason)}`)
    } else if (axis.confidence !== null && axis.confidence < minConfidence) {
      problems.push(
        `${name} axis: low confidence (${axis.confidence.toFixed(2)})`,
      )
    }
  }
  return problems.length > 0 ? problems.join('; ') : null
}

function errorOf(error: unknown): DigitizerError {
  return DigitizerError.from(error, 'AUTO_SERVICE_FAILED')
}

/**
 * Run Auto digitize on the loaded image. Never rejects for a service
 * failure or a cancel: the outcome says how far the run got.
 */
export async function runAutoDigitize(
  ctx: DigitizerContext,
  options: AutoDigitizeOptions,
): Promise<AutoDigitizeOutcome> {
  const { method, params, signal, onStep } = options
  const outcome: AutoDigitizeOutcome = {
    status: 'failed',
    method,
    stoppedAt: 'axes',
    reason: '',
    error: null,
    appliedAxes: [],
    proposal: null,
    extraction: null,
    undoSteps: 0,
  }
  const end = (
    status: AutoDigitizeStatus,
    reason: string,
    error: DigitizerError | null = null,
  ): AutoDigitizeOutcome => {
    outcome.status = status
    outcome.reason = reason
    outcome.error = error
    return outcome
  }

  // INFO: both halves have to be allowed before anything is asked; a run
  // that could calibrate but never extract is not what the button promises
  const { autoFeatures } = ctx
  if (!autoFeatures.canAutoPlace || !autoFeatures.has(method)) {
    const error = new DigitizerError(
      'AUTO_SERVICE_FAILED',
      `Auto digitize needs Auto-place and "${method}"; the service does not allow both`,
    )
    return end('failed', error.message, error)
  }

  // --- 1. axes ------------------------------------------------------------
  onStep?.('axes')
  let proposal: AutoCalibrationProposal
  try {
    proposal = await requestAutoCalibration(ctx, signal)
  } catch (e) {
    if (isImageChangedError(e)) {
      return end('cancelled', 'Cancelled while reading the axes.')
    }
    const error = errorOf(e)
    return end('failed', `Reading the axes failed: ${error.message}`, error)
  }
  outcome.proposal = proposal

  const problem = autoDigitizeAxesProblem(proposal, options.minAxisConfidence)
  if (problem) {
    // INFO: the proposal stays pending, so Axis Auto-place shows it with its
    // ticks on the image and the person decides whether to apply it
    return end('stopped', `The axes were not applied (${problem}).`)
  }

  const axisSetId = ctx.axisSetRepository.activeAxisSetId
  outcome.appliedAxes = applyAutoCalibration(
    ctx,
    proposal,
    ['x', 'y'],
    AUTO_DIGITIZE_ACTION,
  )
  outcome.undoSteps = 1
  // INFO: any capture / undo / redo / clear after ours means the drafts can
  // no longer silently join our step (see UNDO above)
  let historyMoved = false
  const unsubscribe = ctx.historyManager.subscribe(() => {
    historyMoved = true
  })

  // --- 2. extract ---------------------------------------------------------
  outcome.stoppedAt = 'extract'
  onStep?.('extract')
  let result
  try {
    result = await requestServerExtraction(ctx, { method, params, signal })
  } catch (e) {
    unsubscribe()
    if (isImageChangedError(e)) {
      return end(
        'cancelled',
        'Cancelled after the axes were applied; no drafts were made.',
      )
    }
    const error = errorOf(e)
    return end(
      'failed',
      `The axes were applied, but the extraction failed: ${error.message}`,
      error,
    )
  }
  unsubscribe()

  if (ctx.axisSetRepository.activeAxisSetId !== axisSetId) {
    return end(
      'cancelled',
      'The active axis set changed during the run; no drafts were made.',
    )
  }
  if (result.series.length === 0) {
    outcome.extraction = {
      seriesCount: 0,
      pointCount: 0,
      datasetIds: [],
      replacedDraftCount: 0,
      hasScores: false,
    }
    return end('no_points', 'The axes were applied, but no points were found.')
  }

  const { datasetIds, replacedDraftCount } = applyServerExtractionDrafts(
    ctx,
    result,
    method,
    historyMoved ? 'extract.server' : null,
  )
  if (historyMoved) outcome.undoSteps = 2
  outcome.extraction = {
    seriesCount: result.series.length,
    pointCount: result.series.reduce((n, s) => n + s.points.length, 0),
    datasetIds,
    replacedDraftCount,
    hasScores: result.series.some((s) =>
      s.points.some((p) => p.score !== undefined),
    ),
  }
  outcome.stoppedAt = null
  return end('done', '')
}
