import { DigitizerContext } from '@/application/digitizerContext'
import { toErrorPayload, DigitizerError } from '@/application/errors'
import {
  AutoExtractionLoadResult,
  buildEditLog,
  loadAutoExtraction,
  loadAutoExtractionFromUrl,
} from '@/application/utils/autoExtractionOperations'

// INFO: the two ways a pipeline hands a document to a running digitizer
// without a host writing code: a URL parameter and postMessage
// (docs/design/auto-extraction-review-design.md, "渡し方"). Both are opt-in —
// the standalone app installs them; a library host calls them only if it
// wants them.

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
    const payload = toErrorPayload(
      DigitizerError.from(error, 'AUTO_EXTRACTION_INVALID'),
    )
    console.error('[starry-digitizer] auto-extraction import failed', error)
    return {
      success: false,
      errorMessage: `Error importing auto-extraction: ${payload.message}`,
    }
  }
}

export const EXTRACTION_URL_PARAM = 'extraction'

export function hasAutoExtractionUrlParam(href = window.location.href) {
  return new URL(href).searchParams.has(EXTRACTION_URL_PARAM)
}

/** ?extraction=<URL of the JSON> → fetch and load it. null = no parameter. */
export async function loadAutoExtractionFromUrlParam(
  ctx: DigitizerContext,
  href = window.location.href,
): Promise<AutoExtractionOperationResult | null> {
  const param = new URL(href).searchParams.get(EXTRACTION_URL_PARAM)
  if (!param) return null
  return runLoad(() => loadAutoExtractionFromUrl(ctx, param, href))
}

/** Load a document picked in a file input (File → Import Auto-Extraction). */
export async function loadAutoExtractionFile(
  ctx: DigitizerContext,
  file: Blob,
): Promise<AutoExtractionOperationResult> {
  return runLoad(async () => loadAutoExtraction(ctx, await file.text()))
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
  ctx: DigitizerContext,
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
        loadAutoExtraction(ctx, data.document, { image: data.image }),
      )
      onLoaded?.(result)
      reply({
        type: MESSAGE_TYPE.LOAD_RESULT,
        ok: result.success,
        result: result.result ?? null,
        error: result.errorMessage ?? null,
      })
    } else if (data.type === MESSAGE_TYPE.GET_EDIT_LOG) {
      reply({ type: MESSAGE_TYPE.EDIT_LOG, editLog: buildEditLog(ctx) })
    }
  }

  win.addEventListener('message', handler)
  // INFO: carries no data, so '*' is fine; tells the sender it may post now
  trusted.forEach((w) => w.postMessage({ type: MESSAGE_TYPE.READY }, '*'))
  return () => win.removeEventListener('message', handler)
}
