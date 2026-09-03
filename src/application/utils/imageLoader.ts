import { DigitizerError } from '@/application/errors'
import { VALID_IMAGE_TYPES } from '@/presentation/constants'

/**
 * Anything an image can be handed to StarryDigitizer as:
 * - a Blob / File (recommended for hosts: fetch a signed URL yourself and
 *   pass the Blob, so the canvas never becomes tainted)
 * - a data: URL
 * - an http(s) or relative URL (fetched with credentials: 'include')
 */
export type ImageSource = Blob | string

const VALID_MIME_TYPES = VALID_IMAGE_TYPES.map((t) => t.fileType)

export function isValidImageType(mimeType: string): boolean {
  return VALID_MIME_TYPES.includes(mimeType)
}

export function validImageExtensions(): string[] {
  return VALID_IMAGE_TYPES.flatMap((t) => t.extensions)
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('FileReader did not return a string'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Single entry point for turning any ImageSource into a data URL that
 * canvasHandler.initializeImageElement() accepts. Used by the file input /
 * drag&drop / paste paths as well as by the host-facing `image` prop.
 */
export async function loadImageAsDataUrl(source: ImageSource): Promise<string> {
  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      return source
    }
    let response: Response
    try {
      response = await fetch(source, { credentials: 'include' })
    } catch (error) {
      throw new DigitizerError(
        'IMAGE_LOAD_FAILED',
        `Failed to fetch image: ${source}`,
        error,
      )
    }
    if (!response.ok) {
      throw new DigitizerError(
        'IMAGE_LOAD_FAILED',
        `Failed to fetch image (${response.status}): ${source}`,
      )
    }
    const blob = await response.blob()
    return loadBlobAsDataUrl(blob)
  }
  return loadBlobAsDataUrl(source)
}

async function loadBlobAsDataUrl(blob: Blob): Promise<string> {
  if (blob.type && !isValidImageType(blob.type)) {
    throw new DigitizerError(
      'INVALID_IMAGE_TYPE',
      `Please use an image in one of the following formats: ${validImageExtensions().join(
        ', ',
      )}`,
    )
  }
  try {
    return await readBlobAsDataUrl(blob)
  } catch (error) {
    throw new DigitizerError(
      'IMAGE_LOAD_FAILED',
      'Failed to read image data',
      error,
    )
  }
}

export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((res) => res.blob())
}
