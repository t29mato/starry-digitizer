import { DigitizerContext } from '@/application/digitizerContext'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  parseExtractionResponse,
  ServerExtractionResult,
  ServerExtractionSeries,
  toBackendPx,
} from '@/application/services/autoService/autoServiceWire'
import {
  bindToCurrentImage,
  requireAutoFeature,
} from '@/application/utils/autoFeatureOperations'
import { activateDataset } from '@/application/utils/datasetOperations'
import { Dataset } from '@/domain/models/dataset/dataset'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import { Point, Rect } from '@/@types/types'

// INFO: Server Extraction (Starrydata2 v4 board P2): the backend finds the
// data points (MarkerNet: markers, LineFormer: lines) and the digitizer turns
// each series it returns into a DRAFT dataset for the user to correct.
//
// The backend returns PIXELS ONLY. Values come from the digitizer's own axis
// calibration, exactly as for a hand-placed point — so fixing an axis later
// fixes every extracted value with it, and nothing here needs the axes to be
// calibrated before extracting.
//
// Undo: one Extract is ONE step ('extract.server'), however many datasets it
// creates (board P3). Undo removes the whole draft at once.
//
// Re-extracting (another threshold, say) REPLACES the drafts the same method
// made on the same axis set — but only those nobody has touched since. A
// draft someone edited (moved, added or deleted a point, renamed it, took
// low-score points out) is kept, and the new draft gets a name of its own.

export interface ServerExtractionOptions {
  method: ExtractionMethod
  /** method parameters, sent as query parameters (e.g. `threshold`) */
  params?: Record<string, number>
  /**
   * Where to look, in original-image pixels. Undefined = the active axis
   * set's plot area if it has one (Auto-place sets it), else the whole
   * image. null = the whole image.
   */
  area?: Rect | null
  /**
   * Cancels the request. An answer that arrives after it was aborted — or
   * after the image changed — is dropped, never applied (the promise rejects;
   * see isImageChangedError()).
   */
  signal?: AbortSignal
}

export interface ServerExtractionOutcome {
  result: ServerExtractionResult
  /** ids of the datasets the series went into, in series order */
  datasetIds: number[]
  /** how many untouched drafts of an earlier Extract were replaced */
  replacedDraftCount: number
}

/**
 * Ask the service to extract points. Changes nothing.
 *
 * @throws DigitizerError('AUTO_SERVICE_FAILED') when the method is not
 * available, no image is loaded, or the service fails.
 */
export async function requestServerExtraction(
  ctx: DigitizerContext,
  options: ServerExtractionOptions,
): Promise<ServerExtractionResult> {
  const service = requireAutoFeature(ctx, options.method)
  const area =
    options.area === undefined
      ? ctx.axisSetRepository.activeAxisSet.plotArea
      : options.area
  const { signal } = options
  const { image, settle } = bindToCurrentImage(ctx, signal)
  const request = {
    method: options.method,
    params: options.params,
    area: area
      ? {
          x0: toBackendPx(area.xPx),
          y0: toBackendPx(area.yPx),
          x1: toBackendPx(area.xPx + area.widthPx),
          y1: toBackendPx(area.yPx + area.heightPx),
        }
      : undefined,
  }
  let body: unknown
  try {
    body = await (signal
      ? service.extract(image, request, { signal })
      : service.extract(image, request))
  } catch (error) {
    // INFO: a fetch cut off by our own abort is a cancel, not a failure
    settle()
    throw error
  }
  settle()
  return parseExtractionResponse(body)
}

/**
 * Turn the series of an extraction into datasets on the active axis set,
 * as one undo step. The untouched drafts an earlier Extract with the same
 * method made on this axis set are reused (in order; the ones left over are
 * removed), else the active dataset when it is still empty, so extracting
 * into a fresh project does not leave an empty "dataset 1" behind. Each
 * point keeps the method's score for it (MarkerNet), which is what the
 * confidence review (Review Points) steps through.
 *
 * @returns the dataset ids, in series order. Nothing is captured when the
 * extraction found no series.
 */
export function applyServerExtraction(
  ctx: DigitizerContext,
  result: ServerExtractionResult,
  method: ExtractionMethod,
): number[] {
  return applyDrafts(ctx, result, method).datasetIds
}

/**
 * applyServerExtraction(), with control over the undo step: `action` names
 * it, and null captures NOTHING, for a caller that already captured the
 * state to go back to and wants these drafts in that same step (Auto
 * digitize: axes + drafts = one Undo, autoDigitizeOperations.ts).
 */
export function applyServerExtractionDrafts(
  ctx: DigitizerContext,
  result: ServerExtractionResult,
  method: ExtractionMethod,
  action: string | null = 'extract.server',
): { datasetIds: number[]; replacedDraftCount: number } {
  return applyDrafts(ctx, result, method, action)
}

function applyDrafts(
  ctx: DigitizerContext,
  result: ServerExtractionResult,
  method: ExtractionMethod,
  action: string | null = 'extract.server',
): { datasetIds: number[]; replacedDraftCount: number } {
  if (result.series.length === 0) {
    return { datasetIds: [], replacedDraftCount: 0 }
  }
  const { axisSetRepository, datasetRepository } = ctx
  const { historyManager, interpolator } = ctx

  if (action !== null) historyManager.capture(action)
  if (interpolator.isActive) interpolator.clearPreview()
  axisSetRepository.activeAxisSet.inactivateAxis()

  const axisSetId = axisSetRepository.activeAxisSetId
  const drafts = datasetRepository.datasets.filter(
    (dataset) =>
      dataset.axisSetId === axisSetId && isUntouchedDraft(ctx, dataset, method),
  )
  const emptyActive =
    datasetRepository.isViewAllMode ||
    datasetRepository.activeDataset.points.length > 0 ||
    datasetRepository.activeDataset.scoreRemovedPoints.length > 0
      ? null
      : datasetRepository.activeDataset
  const reusable: DatasetInterface[] =
    drafts.length > 0 ? drafts : emptyActive ? [emptyActive] : []

  // INFO: the names of the datasets that stay; a kept (edited) draft keeps
  // its name and the new one is numbered after it
  const taken = new Set(
    datasetRepository.datasets
      .filter((dataset) => !reusable.includes(dataset))
      .map((dataset) => dataset.name),
  )

  const ids = result.series.map((series, index) => {
    const points: Point[] = series.points.map((p, i) => {
      const point: Point = { id: i + 1, xPx: p.xPx, yPx: p.yPx }
      if (p.score !== undefined) point.score = p.score
      return point
    })
    const name = uniqueName(draftName(series, index, method), taken)
    taken.add(name)
    const target = reusable[index]
    if (target) {
      target.name = name
      target.points = points
      target.visiblePointIds = points.map((p) => p.id)
      target.manuallyAddedPointIds = []
      target.scoreRemovedPoints = []
      target.inactivatePoints()
      target.setAxisSetId(axisSetId)
      return target.id
    }
    const dataset = new Dataset(name, points, datasetRepository.nextDatasetId)
    dataset.setAxisSetId(axisSetId)
    dataset.visiblePointIds = points.map((p) => p.id)
    datasetRepository.addDataset(dataset)
    return dataset.id
  })
  // INFO: fewer series than last time: the surplus untouched drafts go too
  // (at least one draft was reused above, so the list never becomes empty)
  const surplus = drafts.slice(result.series.length)
  surplus.forEach((dataset) => datasetRepository.removeDataset(dataset.id))

  activateDataset(ctx, ids[0])
  ids.forEach((id) => {
    const dataset = datasetRepository.datasets.find((d) => d.id === id)
    if (dataset) rememberDraft(ctx, dataset, method)
  })
  return { datasetIds: ids, replacedDraftCount: drafts.length }
}

// INFO: "untouched" is decided by CONTENT, like editLogDiff.ts decides the
// correction cost: a draft is untouched when it is exactly what an Extract
// left behind. Comparing states instead of counting operations makes undo /
// redo come out right without any bookkeeping — undoing the second Extract
// brings back the first one's drafts, and those are recognised again,
// because every state an Extract produced is remembered (per context,
// view state only: not saved, not in the undo history). A project reloaded
// from a file has no memory, so its drafts count as edited and are kept —
// the safe side.
const MAX_REMEMBERED_DRAFTS = 500
const draftMemory = new WeakMap<
  DigitizerContext,
  Map<string, ExtractionMethod>
>()

function draftFingerprint(dataset: DatasetInterface): string {
  return JSON.stringify([
    dataset.id,
    dataset.name,
    dataset.axisSetId,
    dataset.points.map((p) => [p.id, p.xPx, p.yPx, p.score ?? null]),
    dataset.visiblePointIds,
    dataset.manuallyAddedPointIds,
    dataset.scoreRemovedPoints.length,
  ])
}

function rememberDraft(
  ctx: DigitizerContext,
  dataset: DatasetInterface,
  method: ExtractionMethod,
): void {
  let memory = draftMemory.get(ctx)
  if (!memory) {
    memory = new Map()
    draftMemory.set(ctx, memory)
  }
  const fingerprint = draftFingerprint(dataset)
  memory.delete(fingerprint)
  memory.set(fingerprint, method)
  if (memory.size > MAX_REMEMBERED_DRAFTS) {
    const oldest = memory.keys().next().value
    if (oldest !== undefined) memory.delete(oldest)
  }
}

/**
 * True when `dataset` is exactly what an Extract with `method` left behind:
 * nobody moved, added, deleted or renamed anything in it since.
 */
export function isUntouchedDraft(
  ctx: DigitizerContext,
  dataset: DatasetInterface,
  method: ExtractionMethod,
): boolean {
  return draftMemory.get(ctx)?.get(draftFingerprint(dataset)) === method
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name
  let n = 2
  while (taken.has(`${name} ${n}`)) n++
  return `${name} ${n}`
}

// INFO: the legend text when the backend matched one (that is the name a
// curator would type), else the method's own label. The method stays in the
// name so a draft is recognisable as one in the dataset list.
function draftName(
  series: ServerExtractionSeries,
  index: number,
  method: ExtractionMethod,
): string {
  const label = series.legendLabel ?? series.label ?? `series ${index + 1}`
  return `${label} (${method})`
}

/** Request + apply: what the Extract button does. */
export async function runServerExtraction(
  ctx: DigitizerContext,
  options: ServerExtractionOptions,
): Promise<ServerExtractionOutcome> {
  const result = await requestServerExtraction(ctx, options)
  return { result, ...applyDrafts(ctx, result, options.method) }
}
