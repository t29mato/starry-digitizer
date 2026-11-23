import { DigitizerContext } from '@/application/digitizerContext'
import { DigitizerError } from '@/application/errors'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  buildLegendRequest,
  LegendReading,
  LegendSeriesKind,
  legendSeriesId,
  parseLegendResponse,
  ServerExtractionResult,
} from '@/application/services/autoService/autoServiceWire'
import {
  isUntouchedDraft,
  rememberDraft,
} from '@/application/utils/serverExtractionOperations'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

// INFO: F9, legend reading (docs/design/starryai-auto.md §2.1). After an
// extraction has made its drafts, the backend's legend reader (`POST
// /legend`: a VLM reads the legend, the reader matches its entries to the
// series by colour and shape) is asked for their names and order. The
// drafts are there at once; the names come a few seconds later.
//
// The rules are the backend's (backend README, legend_pass.py AUTO_NAME /
// CANDIDATE; real-chart-bench's recommendation):
// - source `vlm` and confidence >= 0.5: the draft is named from the legend
//   (dataset.legend.status 'auto');
// - 0.3–0.5: only offered, as a suggestion a person can accept;
// - below, or another source: nothing.
// The drafts are put in the legend's order (`draft_order`).
//
// What this never does:
// - block or undo the extraction: it runs after the drafts exist, and any
//   failure (no VLM, busy, timeout, unreachable, no `legend()` at all) only
//   leaves a short caption;
// - overwrite a name a person changed: only a draft that still has the name
//   the extraction gave it is renamed;
// - mix its change into another step: the names, the legend notes and the
//   order are ONE undo step of their own, 'extract.legend'.

export const LEGEND_ACTION = 'extract.legend'
export const LEGEND_ACCEPT_ACTION = 'extract.legend.accept'
/** at or above: the draft is named from the legend */
export const LEGEND_AUTO_NAME_CONFIDENCE = 0.5
/** at or above (and below the auto-name line): offered as a suggestion */
export const LEGEND_SUGGESTION_CONFIDENCE = 0.3

export type LegendNamingStatus =
  /** the reader answered; `named` / `suggestions` say what came of it */
  | 'done'
  /** the reader gave no legend (busy, no VLM, timeout, none in the figure) */
  | 'no_legend'
  /** the request failed (unreachable, HTTP error, an odd answer) */
  | 'failed'
  /** a newer extraction, a new image or the caller cancelled it */
  | 'cancelled'
  /** the service has no legend reader; nothing was asked */
  | 'unsupported'

export interface LegendNamed {
  datasetId: number
  label: string
  confidence: number
}

export interface LegendNamingOutcome {
  status: LegendNamingStatus
  /** why there are no names, in a few words ('' when done) */
  reason: string
  /** drafts named from the legend ('auto') */
  named: LegendNamed[]
  /** drafts with a suggestion only (0.3–0.5) */
  suggestions: LegendNamed[]
  /** drafts the legend would have named, left alone: a person renamed them */
  keptNames: number
  /** true when the drafts were put in the legend's order */
  reordered: boolean
  /** true when anything changed (and an 'extract.legend' step was captured) */
  changed: boolean
  reading: LegendReading | null
}

/** What an extraction made: the drafts to name. */
export interface LegendTarget {
  result: ServerExtractionResult
  method: ExtractionMethod
  /** the drafts' ids, in series order (what the extraction returned) */
  datasetIds: number[]
}

export interface LegendNamingOptions {
  signal?: AbortSignal
}

const KIND_OF_METHOD: Record<ExtractionMethod, LegendSeriesKind> = {
  markernet: 'marker',
  lineformer: 'line',
}

// INFO: one request at a time per digitizer (the reader itself runs one pass
// at a time): a newer extraction's request cancels the older one, whose
// drafts are gone or replaced anyway
const running = new WeakMap<DigitizerContext, AbortController>()

function outcomeOf(
  status: LegendNamingStatus,
  reason: string,
  reading: LegendReading | null = null,
): LegendNamingOutcome {
  return {
    status,
    reason,
    named: [],
    suggestions: [],
    keptNames: 0,
    reordered: false,
    changed: false,
    reading,
  }
}

/** True when the service can read legends (`legend()` is optional). */
export function canReadLegend(ctx: DigitizerContext): boolean {
  return typeof ctx.autoFeatures.service?.legend === 'function'
}

/**
 * Ask the legend reader for the names and order of the drafts an
 * extraction just made, and apply them (one undo step, 'extract.legend').
 * Call it right after the drafts were made, without awaiting it before
 * showing the extraction's result. Never rejects.
 */
export async function readLegendNames(
  ctx: DigitizerContext,
  target: LegendTarget,
  options: LegendNamingOptions = {},
): Promise<LegendNamingOutcome> {
  const service = ctx.autoFeatures.service
  if (!service?.legend) {
    return outcomeOf('unsupported', 'This service does not read legends.')
  }
  if (target.result.series.length === 0 || target.datasetIds.length === 0) {
    return outcomeOf('no_legend', 'No series to name.')
  }
  const imageUrl = ctx.canvasHandler.uploadImageUrl
  const image = imageUrl ? base64OfDataUrl(imageUrl) : null
  if (!image) return outcomeOf('failed', 'No image to read the legend from.')

  // INFO: the names the drafts have now; a draft whose name differs when the
  // answer comes was renamed by a person, and keeps that name
  const draftNames = new Map<number, string>()
  target.datasetIds.forEach((id) => {
    const dataset = findDataset(ctx, id)
    if (dataset) draftNames.set(id, dataset.name)
  })

  running.get(ctx)?.abort()
  const controller = new AbortController()
  running.set(ctx, controller)
  const onCancel = () => controller.abort()
  if (options.signal?.aborted) onCancel()
  else options.signal?.addEventListener('abort', onCancel)
  const stale = () =>
    controller.signal.aborted ||
    ctx.canvasHandler.uploadImageUrl !== imageUrl ||
    ctx.autoFeatures.service !== service

  try {
    const body = buildLegendRequest(
      image,
      target.result.series,
      KIND_OF_METHOD[target.method],
    )
    let answer: unknown
    try {
      answer = await service.legend(body, { signal: controller.signal })
    } catch (error) {
      if (stale()) return outcomeOf('cancelled', 'Legend reading cancelled.')
      return outcomeOf(
        'failed',
        `Legend not read: ${
          DigitizerError.from(error, 'AUTO_SERVICE_FAILED').message
        }`,
      )
    }
    if (stale()) return outcomeOf('cancelled', 'Legend reading cancelled.')
    let reading: LegendReading
    try {
      reading = parseLegendResponse(answer)
    } catch (error) {
      return outcomeOf(
        'failed',
        `Legend not read: ${
          DigitizerError.from(error, 'AUTO_SERVICE_FAILED').message
        }`,
      )
    }
    return applyLegendReading(ctx, target, reading, draftNames)
  } finally {
    options.signal?.removeEventListener('abort', onCancel)
    if (running.get(ctx) === controller) running.delete(ctx)
  }
}

/**
 * Apply a legend reading to the drafts of `target` (see the rules at the top
 * of this file). `draftNames` are the names the drafts had when the reader
 * was asked (default: their names now). Captures one 'extract.legend' step
 * when anything changes, nothing otherwise.
 */
export function applyLegendReading(
  ctx: DigitizerContext,
  target: LegendTarget,
  reading: LegendReading,
  draftNames?: Map<number, string>,
): LegendNamingOutcome {
  if (reading.status !== 'ok' || reading.source === null) {
    return outcomeOf('no_legend', legendReason(reading), reading)
  }
  if (reading.source !== 'vlm') {
    // INFO: the OCR-only path's names are not to be used (backend README);
    // nor its order, which is then just the input order anyway
    return outcomeOf('no_legend', legendReason(reading), reading)
  }
  const { datasetRepository, historyManager } = ctx
  const outcome = outcomeOf('done', '', reading)
  const datasetOf = new Map<string, DatasetInterface>()
  target.datasetIds.forEach((id, index) => {
    const dataset = findDataset(ctx, id)
    if (dataset) datasetOf.set(legendSeriesId(index), dataset)
  })

  type Change = { dataset: DatasetInterface; rename: boolean; note: Note }
  type Note = NonNullable<DatasetInterface['legend']>
  const changes: Change[] = []
  reading.assignments.forEach((assignment) => {
    const dataset = datasetOf.get(assignment.seriesId)
    if (!dataset || assignment.confidence < LEGEND_SUGGESTION_CONFIDENCE) {
      return
    }
    const expected = draftNames?.get(dataset.id) ?? dataset.name
    const auto = assignment.confidence >= LEGEND_AUTO_NAME_CONFIDENCE
    if (dataset.name !== expected) {
      if (auto) outcome.keptNames++
      return
    }
    const note: Note = {
      label: assignment.label,
      confidence: assignment.confidence,
      source: reading.source as string,
      status: auto ? 'auto' : 'suggestion',
    }
    const named = {
      datasetId: dataset.id,
      label: assignment.label,
      confidence: assignment.confidence,
    }
    ;(auto ? outcome.named : outcome.suggestions).push(named)
    changes.push({ dataset, rename: auto, note })
  })

  const order = legendOrder(ctx, [...datasetOf.values()], reading, datasetOf)
  outcome.reordered = order !== null
  if (changes.length === 0 && order === null) return outcome

  // INFO: decided before anything changes: a draft the extraction left
  // untouched stays "untouched" (re-extracting replaces it) after the
  // legend named it — the digitizer named it, not a person
  const untouched = new Set(
    [...datasetOf.values()].filter((dataset) =>
      isUntouchedDraft(ctx, dataset, target.method),
    ),
  )
  historyManager.capture(LEGEND_ACTION)
  outcome.changed = true
  const renamed = new Set(changes.filter((c) => c.rename).map((c) => c.dataset))
  // INFO: the names of the datasets not renamed stay taken, so a legend name
  // that clashes with one gets a number, never the other's name
  const taken = new Set(
    datasetRepository.datasets
      .filter((dataset) => !renamed.has(dataset))
      .map((dataset) => dataset.name),
  )
  changes.forEach(({ dataset, rename, note }) => {
    if (rename) {
      const name = uniqueName(legendName(note.label, target.method), taken)
      taken.add(name)
      dataset.name = name
    }
    dataset.legend = note
  })
  if (order) datasetRepository.datasets = order
  untouched.forEach((dataset) => rememberDraft(ctx, dataset, target.method))
  return outcome
}

/**
 * Apply a suggestion (status 'suggestion') to its dataset: name it from the
 * legend, as one undo step ('extract.legend.accept'). Returns false when the
 * dataset has no suggestion.
 */
export function acceptLegendSuggestion(
  ctx: DigitizerContext,
  datasetId: number,
  method: ExtractionMethod,
): boolean {
  const dataset = findDataset(ctx, datasetId)
  const note = dataset?.legend
  if (!dataset || !note || note.status !== 'suggestion') return false
  const wasUntouched = isUntouchedDraft(ctx, dataset, method)
  ctx.historyManager.capture(LEGEND_ACCEPT_ACTION)
  const taken = new Set(
    ctx.datasetRepository.datasets
      .filter((other) => other !== dataset)
      .map((other) => other.name),
  )
  dataset.name = uniqueName(legendName(note.label, method), taken)
  dataset.legend = { ...note, status: 'accepted' }
  // INFO: accepting is a person's choice of a name, but not an edit of the
  // draft's points: re-extracting may still replace it, like a draft the
  // legend named by itself
  if (wasUntouched) rememberDraft(ctx, dataset, method)
  return true
}

// INFO: the same shape as an extraction's draft name (serverExtraction
// Operations.ts draftName): the method stays, so a draft is recognisable
// as one in the dataset list
export function legendName(label: string, method: ExtractionMethod): string {
  return `${label} (${method})`
}

// INFO: the run's drafts go into the places they hold in the list now, in
// the legend's order (its draft_order; ids it does not list keep their
// relative order after the listed ones). Other datasets do not move.
// null = already in that order.
function legendOrder(
  ctx: DigitizerContext,
  drafts: DatasetInterface[],
  reading: LegendReading,
  datasetOf: Map<string, DatasetInterface>,
): DatasetInterface[] | null {
  const { datasets } = ctx.datasetRepository
  const rank = new Map<DatasetInterface, number>()
  reading.draftOrder.forEach((id, index) => {
    const dataset = datasetOf.get(id)
    if (dataset && !rank.has(dataset)) rank.set(dataset, index)
  })
  if (rank.size < 2) return null
  const slots = datasets
    .map((dataset, index) => (drafts.includes(dataset) ? index : -1))
    .filter((index) => index >= 0)
  const current = slots.map((index) => datasets[index])
  const sorted = current
    .map((dataset, index) => ({ dataset, index }))
    .sort(
      (a, b) =>
        (rank.get(a.dataset) ?? Infinity) - (rank.get(b.dataset) ?? Infinity) ||
        a.index - b.index,
    )
    .map((entry) => entry.dataset)
  if (sorted.every((dataset, index) => dataset === current[index])) return null
  const next = [...datasets]
  slots.forEach((slot, index) => {
    next[slot] = sorted[index]
  })
  return next
}

const NO_LEGEND_REASONS: Record<string, string> = {
  busy: 'the legend reader is busy',
  vlm_unavailable: 'the legend reader is not running',
  timeout: 'the legend reader did not answer in time',
  vlm_error: 'the legend reader could not read this figure',
  off: 'the legend reader is off',
  no_series: 'no series to name',
  error: 'the legend reader failed',
}

function legendReason(reading: LegendReading): string {
  if (reading.status === 'ok') {
    return 'No legend found in the figure.'
  }
  const why = NO_LEGEND_REASONS[reading.status] ?? reading.status
  return `Legend not read: ${why}.`
}

function findDataset(
  ctx: DigitizerContext,
  id: number,
): DatasetInterface | undefined {
  return ctx.datasetRepository.datasets.find((dataset) => dataset.id === id)
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name
  let n = 2
  while (taken.has(`${name} ${n}`)) n++
  return `${name} ${n}`
}

/** The base64 part of a data URL (encoding it when it is not base64). */
export function base64OfDataUrl(dataUrl: string): string | null {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) return null
  const header = dataUrl.slice(5, comma)
  const data = dataUrl.slice(comma + 1)
  if (header.split(';').includes('base64')) return data || null
  // INFO: the text as UTF-8 bytes, one char per byte, for btoa
  const binary = encodeURIComponent(decodeURIComponent(data)).replace(
    /%([0-9A-F]{2})/g,
    (_, hex: string) => String.fromCharCode(parseInt(hex, 16)),
  )
  return binary ? btoa(binary) : null
}
