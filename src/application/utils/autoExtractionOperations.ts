import { DigitizerContext } from '@/application/digitizerContext'
import { DigitizerError } from '@/application/errors'
import {
  AutoExtractionFormatError,
  ParsedAutoExtraction,
  parseAutoExtraction,
} from '@/application/utils/autoExtractionParser'
import {
  buildFinalDocument,
  buildImportPlan,
  captureReviewState,
} from '@/application/utils/autoExtractionImport'
import {
  DEFAULT_MOVE_TOLERANCE_PX,
  EditLog,
  ReviewCalibration,
} from '@/application/services/reviewSession/reviewSession'
import { Dataset } from '@/domain/models/dataset/dataset'
import { AutoExtractionDocumentDTO } from '@/application/dto/autoExtractionDTO'
import {
  buildReviewDiffOverlay,
  ReviewDiffOverlay,
} from '@/application/utils/reviewDiffOverlay'
import { EditLogDiff } from '@/application/utils/editLogDiff'
import { applyImage } from '@/application/utils/digitizerOperations'

// INFO: Every entry point of the auto-extraction review — File menu, URL
// parameter, postMessage, library API — goes through here
// (docs/design/auto-extraction-review-design.md). Like the other use cases in
// this directory it takes the DigitizerContext it acts on, so two digitizers
// on one page review independently. The browser-only parts (file picker,
// download, postMessage) live in autoExtractionBridge.ts and the presentation
// layer.

export type AutoExtractionLoadOptions = {
  // INFO: overrides the document's `image`; URL or data URL
  image?: string
  // INFO: base for resolving a relative image URL (e.g. the JSON's own URL)
  baseUrl?: string
}

export type AutoExtractionLoadResult = {
  series: number
  points: number
  calibration: ReviewCalibration | null
  warnings: string[]
}

/**
 * Replace the whole state with an auto-extraction document and start a
 * review: one axis set, one dataset per series, history cleared (snapshots
 * from before the import describe another figure).
 *
 * @throws DigitizerError('AUTO_EXTRACTION_INVALID') when the document cannot
 * be imported; the state is left untouched in that case.
 * @throws DigitizerError('IMAGE_LOAD_FAILED' / 'INVALID_IMAGE_TYPE') when the
 * document's image cannot be loaded.
 */
export async function loadAutoExtraction(
  ctx: DigitizerContext,
  document: unknown,
  options: AutoExtractionLoadOptions = {},
): Promise<AutoExtractionLoadResult> {
  const parsed = parseDocument(document)

  const imageUrl = options.image ?? parsed.image.url
  if (imageUrl) {
    await applyImage(ctx, resolveUrl(imageUrl, options.baseUrl))
  } else {
    await waitForPendingImage(ctx)
  }

  const plan = toDigitizerError(() =>
    buildImportPlan(parsed, currentImageSize(ctx)),
  )

  const {
    axisSetRepository,
    datasetRepository,
    historyManager,
    interpolator,
    reviewSession,
  } = ctx
  if (interpolator.isActive) interpolator.clearPreview()

  axisSetRepository.clearAllAxisSets()
  axisSetRepository.addAxisSet(plan.axisSet)
  axisSetRepository.setActiveAxisSet(plan.axisSet.id)

  datasetRepository.clearAllDatasets()
  plan.datasets.forEach((dataset) => datasetRepository.addDataset(dataset))
  if (plan.datasets.length === 0) {
    datasetRepository.addDataset(new Dataset('dataset 1', [], 1))
  }
  datasetRepository.setActiveDataset(datasetRepository.datasets[0].id)

  historyManager.clear()
  reviewSession.start(
    plan.initialState,
    parsed.source,
    plan.calibration,
    plan.warnings,
  )

  const points = countPoints(parsed)
  ctx.researchEvents.emit({
    type: 'review.start',
    series: plan.datasets.length,
    points,
    warnings: plan.warnings.length,
  })

  return {
    series: plan.datasets.length,
    points,
    calibration: plan.calibration,
    warnings: plan.warnings,
  }
}

function parseDocument(document: unknown): ParsedAutoExtraction {
  return toDigitizerError(() => {
    let json = document
    if (typeof document === 'string') {
      try {
        json = JSON.parse(document)
      } catch (error) {
        throw new DigitizerError(
          'AUTO_EXTRACTION_INVALID',
          'The auto-extraction document is not valid JSON',
          error,
        )
      }
    }
    return parseAutoExtraction(json)
  })
}

// INFO: the parser and the import plan report problems with their own error
// class (it carries the list of problems); a host only ever sees the code.
function toDigitizerError<T>(run: () => T): T {
  try {
    return run()
  } catch (error) {
    if (error instanceof AutoExtractionFormatError) {
      throw new DigitizerError('AUTO_EXTRACTION_INVALID', error.message, error)
    }
    throw DigitizerError.from(error, 'AUTO_EXTRACTION_INVALID')
  }
}

function countPoints(parsed: ParsedAutoExtraction): number {
  return parsed.series.reduce(
    (sum, s) => sum + (s.pointsPx ?? s.pointsValue ?? []).length,
    0,
  )
}

function resolveUrl(url: string, baseUrl?: string): string {
  if (url.startsWith('data:')) return url
  return new URL(url, baseUrl ?? window.location.href).href
}

// INFO: When the document brings no image, it refers to the image already
// shown — which may still be loading, and whose size the import checks
// against.
async function waitForPendingImage(ctx: DigitizerContext): Promise<void> {
  const image = ctx.canvasHandler.imageElement
  if (!image.src || image.complete) return
  await new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  })
}

function currentImageSize(ctx: DigitizerContext) {
  const { canvasHandler } = ctx
  return canvasHandler.originalWidth > 0
    ? {
        width: canvasHandler.originalWidth,
        height: canvasHandler.originalHeight,
      }
    : null
}

/** The edit log of the review in progress, or null outside a review. */
export function buildEditLog(ctx: DigitizerContext): EditLog | null {
  const { axisSetRepository, confidenceReview, datasetRepository } = ctx
  const data = ctx.reviewSession.data
  if (!data) return null
  const editLog = ctx.reviewSession.buildEditLog(
    captureReviewState(axisSetRepository.axisSets, datasetRepository.datasets),
    buildFinalDocument(
      axisSetRepository.axisSets,
      datasetRepository.datasets,
      currentImageSize(ctx),
      data.source,
    ),
    new Date(),
    DEFAULT_MOVE_TOLERANCE_PX,
    confidenceReview.threshold,
  )
  // INFO: counts only — `details` (coordinates), `final` and `source` stay
  // out of the research event (docs/design/auto-service.md §9)
  if (editLog) {
    ctx.researchEvents.emit({
      type: 'review.export',
      elapsed_ms: editLog.elapsed_ms,
      summary: editLog.summary,
    })
  }
  return editLog
}

// INFO: what CanvasReviewDiff.vue draws (docs/design/
// auto-extraction-review-design.md, "6.")
export function currentReviewOverlay(
  ctx: DigitizerContext,
): ReviewDiffOverlay | null {
  const data = ctx.reviewSession.data
  if (!data) return null
  return buildReviewDiffOverlay(
    data.initialState,
    captureReviewState(
      ctx.axisSetRepository.axisSets,
      ctx.datasetRepository.datasets,
    ),
    DEFAULT_MOVE_TOLERANCE_PX,
  )
}

// INFO: live summary for ReviewSessionPanel.vue
export function currentReviewDiff(ctx: DigitizerContext): EditLogDiff | null {
  return ctx.reviewSession.diff(
    captureReviewState(
      ctx.axisSetRepository.axisSets,
      ctx.datasetRepository.datasets,
    ),
  )
}

/**
 * Stop tracking edits: the imported state and the event log are discarded.
 * The points themselves stay as they are.
 */
export function endReview(ctx: DigitizerContext): void {
  // INFO: emitted before clear() so review_t_ms still has its clock
  if (ctx.reviewSession.isActive) {
    ctx.researchEvents.emit({ type: 'review.end' })
  }
  ctx.reviewSession.clear()
  ctx.reviewView.setShowChanges(false)
  ctx.reviewView.setShowInitial(false)
}

// INFO: The current state in the import format, with or without a review
// (docs/design/auto-extraction-review-design.md, "5."): pixel + value
// coordinates, axis ticks, plot/legend areas and markers — usable as
// detector training labels. Same content as an edit log's `final`.
export function buildDataDocument(
  ctx: DigitizerContext,
): AutoExtractionDocumentDTO {
  return buildFinalDocument(
    ctx.axisSetRepository.axisSets,
    ctx.datasetRepository.datasets,
    currentImageSize(ctx),
    ctx.reviewSession.data?.source ?? null,
  )
}

/**
 * Fetch an auto-extraction document from `url` (http/https only) and load
 * it. A relative image URL inside the document is resolved against the
 * document's own URL, so a pipeline can serve both from one directory.
 */
export async function loadAutoExtractionFromUrl(
  ctx: DigitizerContext,
  url: string,
  baseUrl: string = window.location.href,
): Promise<AutoExtractionLoadResult> {
  const jsonUrl = new URL(url, baseUrl)
  if (jsonUrl.protocol !== 'https:' && jsonUrl.protocol !== 'http:') {
    throw new DigitizerError(
      'AUTO_EXTRACTION_INVALID',
      `unsupported URL scheme: ${jsonUrl.protocol}`,
    )
  }
  let response: Response
  try {
    response = await fetch(jsonUrl.href)
  } catch (error) {
    throw new DigitizerError(
      'AUTO_EXTRACTION_INVALID',
      `failed to fetch ${jsonUrl.href}`,
      error,
    )
  }
  if (!response.ok) {
    throw new DigitizerError(
      'AUTO_EXTRACTION_INVALID',
      `failed to fetch ${jsonUrl.href}: ${response.status}`,
    )
  }
  return loadAutoExtraction(ctx, await response.json(), {
    baseUrl: jsonUrl.href,
  })
}
