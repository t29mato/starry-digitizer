import { reactive } from 'vue'
import {
  canvasHandler as rawCanvasHandler,
  confidenceReview,
  extractor,
  historyManager,
  interpolator,
  reviewSession,
} from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import {
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

// INFO: Every entry point of the auto-extraction review — File menu, URL
// parameter, postMessage, library API — goes through here, mirroring
// projectFileOperations.ts (docs/design/auto-extraction-review-design.md).

// INFO: The repositories are plain singletons that become reactive only
// through components' data(); mutating the raw objects from here would not
// re-render anything, so go through the (cached, shared) reactive proxies.
const axisSets = reactive(axisSetRepository)
const datasets = reactive(datasetRepository)
// INFO: same for uploadImageUrl, which MagnifierImage.vue renders
const canvasHandler = reactive(rawCanvasHandler)

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

export async function loadAutoExtraction(
  document: unknown,
  options: AutoExtractionLoadOptions = {},
): Promise<AutoExtractionLoadResult> {
  const json = typeof document === 'string' ? JSON.parse(document) : document
  const parsed = parseAutoExtraction(json)

  const imageUrl = options.image ?? parsed.image.url
  if (imageUrl) {
    await loadImage(resolveUrl(imageUrl, options.baseUrl))
  } else {
    await waitForPendingImage()
  }

  const hasImage = canvasHandler.originalWidth > 0
  const plan = buildImportPlan(
    parsed,
    hasImage
      ? {
          width: canvasHandler.originalWidth,
          height: canvasHandler.originalHeight,
        }
      : null,
  )

  interpolator.isActive && interpolator.clearPreview()

  axisSets.clearAllAxisSets()
  axisSets.addAxisSet(plan.axisSet)
  axisSets.setActiveAxisSet(plan.axisSet.id)

  datasets.clearAllDatasets()
  plan.datasets.forEach((dataset) => datasets.addDataset(dataset))
  if (plan.datasets.length === 0) {
    datasets.addDataset(new Dataset('dataset 1', [], 1))
  }
  datasets.setActiveDataset(datasets.datasets[0].id)

  // INFO: same reason as uploading a new image: snapshots from before the
  // import describe a different figure
  historyManager.clear()
  reviewSession.start(
    plan.initialState,
    parsed.source,
    plan.calibration,
    plan.warnings,
  )

  return {
    series: plan.datasets.length,
    points: countPoints(parsed),
    calibration: plan.calibration,
    warnings: plan.warnings,
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

// INFO: Remote images are fetched and turned into a data URL first: an
// <img> loaded straight from another origin would taint the canvas and
// break the built-in extractor and project save. Needs CORS on the server.
async function loadImage(url: string): Promise<void> {
  let dataUrl = url
  if (!url.startsWith('data:')) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`failed to fetch image ${url}: ${response.status}`)
    }
    dataUrl = await blobToDataUrl(await response.blob())
  }
  await canvasHandler.initializeImageElement(dataUrl)
  canvasHandler.drawFitSizeImage()
  canvasHandler.setUploadImageUrl(dataUrl)
  extractor.setSwatches(canvasHandler.colorSwatches)
  interpolator.resizeCanvas()
}

// INFO: When the document brings no image, it refers to the image already
// shown — which may still be loading (CanvasMain's initial image), and
// whose size the import checks against.
async function waitForPendingImage(): Promise<void> {
  const image = canvasHandler.imageElement
  if (!image.src || image.complete) return
  await new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function currentImageSize() {
  return canvasHandler.originalWidth > 0
    ? {
        width: canvasHandler.originalWidth,
        height: canvasHandler.originalHeight,
      }
    : null
}

export function buildEditLog(): EditLog | null {
  if (!reviewSession.data) return null
  return reviewSession.buildEditLog(
    captureReviewState(axisSets.axisSets, datasets.datasets),
    buildFinalDocument(
      axisSets.axisSets,
      datasets.datasets,
      currentImageSize(),
      reviewSession.data.source,
    ),
    new Date(),
    DEFAULT_MOVE_TOLERANCE_PX,
    confidenceReview.threshold,
  )
}

// INFO: live summary for ReviewSessionPanel.vue
export function currentReviewDiff() {
  return reviewSession.diff(
    captureReviewState(axisSets.axisSets, datasets.datasets),
  )
}

export function downloadEditLog(filename?: string): boolean {
  const editLog = buildEditLog()
  if (!editLog) return false
  downloadJson(editLog, filename ?? `edit-log-${timestamp()}.json`)
  return true
}

// INFO: The current state in the import format, with or without a review
// (docs/design/auto-extraction-review-design.md, "5."): pixel + value
// coordinates, axis ticks, plot/legend areas and markers — usable as
// detector training labels. Same content as an edit log's `final`.
export function buildDataDocument(): AutoExtractionDocumentDTO {
  return buildFinalDocument(
    axisSets.axisSets,
    datasets.datasets,
    currentImageSize(),
    reviewSession.data?.source ?? null,
  )
}

export function downloadDataJson(filename?: string): void {
  downloadJson(buildDataDocument(), filename ?? `data-${timestamp()}.json`)
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-')
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export type AutoExtractionOperationResult = {
  success: boolean
  result?: AutoExtractionLoadResult
  errorMessage?: string
}

async function runLoad(
  load: () => Promise<AutoExtractionLoadResult>,
): Promise<AutoExtractionOperationResult> {
  try {
    return { success: true, result: await load() }
  } catch (error) {
    console.error('Error importing auto-extraction:', error)
    return {
      success: false,
      errorMessage: `Error importing auto-extraction: ${
        (error as Error).message
      }`,
    }
  }
}

// INFO: same file-picker approach as triggerLoadProjectDialog()
export function triggerImportAutoExtractionDialog(): Promise<AutoExtractionOperationResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.style.display = 'none'
    const cleanup = () => document.body.removeChild(input)

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      cleanup()
      if (!file) {
        resolve({ success: false, errorMessage: 'No file selected' })
        return
      }
      resolve(await runLoad(async () => loadAutoExtraction(await file.text())))
    })
    input.addEventListener('cancel', () => {
      cleanup()
      resolve({ success: false })
    })

    document.body.appendChild(input)
    input.click()
  })
}

export const EXTRACTION_URL_PARAM = 'extraction'

export function hasAutoExtractionUrlParam(href = window.location.href) {
  return new URL(href).searchParams.has(EXTRACTION_URL_PARAM)
}

// INFO: ?extraction=<URL of the JSON>. A relative image URL inside the JSON
// is resolved against the JSON's URL, so a pipeline can serve both from one
// directory.
export async function loadAutoExtractionFromUrlParam(
  href = window.location.href,
): Promise<AutoExtractionOperationResult | null> {
  const param = new URL(href).searchParams.get(EXTRACTION_URL_PARAM)
  if (!param) return null
  return runLoad(async () => {
    const jsonUrl = new URL(param, href)
    if (jsonUrl.protocol !== 'https:' && jsonUrl.protocol !== 'http:') {
      throw new Error(`unsupported URL scheme: ${jsonUrl.protocol}`)
    }
    const response = await fetch(jsonUrl.href)
    if (!response.ok) {
      throw new Error(`failed to fetch ${jsonUrl.href}: ${response.status}`)
    }
    return loadAutoExtraction(await response.json(), {
      baseUrl: jsonUrl.href,
    })
  })
}

export const MESSAGE_TYPE = {
  READY: 'starry-digitizer:ready',
  LOAD: 'starry-digitizer:load-auto-extraction',
  LOAD_RESULT: 'starry-digitizer:load-result',
  GET_EDIT_LOG: 'starry-digitizer:get-edit-log',
  EDIT_LOG: 'starry-digitizer:edit-log',
} as const

// INFO: Lets the pipeline that opened (window.opener) or embeds
// (window.parent) this page push a document and pull the edit log. Only
// those two windows are listened to, so an arbitrary page cannot replace
// the user's work, and replies go back to the sender's origin only.
export function installAutoExtractionMessageBridge(
  win: Window = window,
  onLoaded?: (result: AutoExtractionOperationResult) => void,
): () => void {
  const trusted = [win.opener, win.parent !== win ? win.parent : null].filter(
    (w): w is Window => !!w,
  )

  const handler = async (event: MessageEvent) => {
    if (!trusted.includes(event.source as Window)) return
    const data = event.data
    if (typeof data !== 'object' || data === null) return
    // INFO: a file:// opener has the opaque origin "null", which is not a
    // valid targetOrigin; the reply still goes only to that window object
    const targetOrigin = event.origin === 'null' ? '*' : event.origin
    const reply = (message: unknown) =>
      (event.source as Window).postMessage(message, targetOrigin)

    if (data.type === MESSAGE_TYPE.LOAD) {
      const result = await runLoad(() =>
        loadAutoExtraction(data.document, { image: data.image }),
      )
      onLoaded?.(result)
      reply({
        type: MESSAGE_TYPE.LOAD_RESULT,
        ok: result.success,
        result: result.result ?? null,
        error: result.errorMessage ?? null,
      })
    } else if (data.type === MESSAGE_TYPE.GET_EDIT_LOG) {
      reply({ type: MESSAGE_TYPE.EDIT_LOG, editLog: buildEditLog() })
    }
  }

  win.addEventListener('message', handler)
  // INFO: carries no data, so '*' is fine; tells the sender it may post now
  trusted.forEach((w) => w.postMessage({ type: MESSAGE_TYPE.READY }, '*'))
  return () => win.removeEventListener('message', handler)
}
