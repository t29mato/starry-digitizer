import { DigitizerContext } from '@/application/digitizerContext'
import { ExtractionMethod } from '@/application/services/autoService/autoService'
import {
  parseExtractionResponse,
  ServerExtractionResult,
  ServerExtractionSeries,
  toBackendPx,
} from '@/application/services/autoService/autoServiceWire'
import {
  currentImageBlob,
  requireAutoFeature,
} from '@/application/utils/autoFeatureOperations'
import { activateDataset } from '@/application/utils/datasetOperations'
import { Dataset } from '@/domain/models/dataset/dataset'
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
}

export interface ServerExtractionOutcome {
  result: ServerExtractionResult
  /** ids of the datasets the series went into, in series order */
  datasetIds: number[]
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
  const body = await service.extract(currentImageBlob(ctx), {
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
  })
  return parseExtractionResponse(body)
}

/**
 * Turn the series of an extraction into datasets on the active axis set,
 * as one undo step. The active dataset is reused when it is still empty, so
 * extracting into a fresh project does not leave an empty "dataset 1" behind.
 * Each point keeps the method's score for it (MarkerNet), which is what the
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
  if (result.series.length === 0) return []
  const { axisSetRepository, datasetRepository } = ctx
  const { historyManager, interpolator } = ctx

  historyManager.capture('extract.server')
  if (interpolator.isActive) interpolator.clearPreview()
  axisSetRepository.activeAxisSet.inactivateAxis()

  const axisSetId = axisSetRepository.activeAxisSetId
  const reusable =
    datasetRepository.isViewAllMode ||
    datasetRepository.activeDataset.points.length > 0 ||
    datasetRepository.activeDataset.scoreRemovedPoints.length > 0
      ? null
      : datasetRepository.activeDataset

  const ids = result.series.map((series, index) => {
    const points: Point[] = series.points.map((p, i) => {
      const point: Point = { id: i + 1, xPx: p.xPx, yPx: p.yPx }
      if (p.score !== undefined) point.score = p.score
      return point
    })
    const name = draftName(series, index, method)
    if (index === 0 && reusable) {
      reusable.name = name
      reusable.points = points
      reusable.visiblePointIds = points.map((p) => p.id)
      reusable.manuallyAddedPointIds = []
      reusable.inactivatePoints()
      reusable.setAxisSetId(axisSetId)
      return reusable.id
    }
    const dataset = new Dataset(name, points, datasetRepository.nextDatasetId)
    dataset.setAxisSetId(axisSetId)
    dataset.visiblePointIds = points.map((p) => p.id)
    datasetRepository.addDataset(dataset)
    return dataset.id
  })

  activateDataset(ctx, ids[0])
  return ids
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
  return {
    result,
    datasetIds: applyServerExtraction(ctx, result, options.method),
  }
}
