import { expect, describe, it, afterEach, jest } from '@jest/globals'
import {
  dataUrlToBlob,
  isValidImageType,
  loadImageAsDataUrl,
  validImageExtensions,
} from './imageLoader'
import { DigitizerError } from '@/application/errors'

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

const expectDigitizerError = async (
  promise: Promise<unknown>,
  code: string,
): Promise<DigitizerError> => {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(DigitizerError)
    expect((error as DigitizerError).code).toBe(code)
    return error as DigitizerError
  }
  throw new Error('expected the promise to reject')
}

describe('isValidImageType', () => {
  it.each(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])(
    'accepts %s',
    (mimeType) => {
      expect(isValidImageType(mimeType)).toBe(true)
    },
  )

  it.each(['image/svg+xml', 'application/pdf', 'text/plain', ''])(
    'rejects %s',
    (mimeType) => {
      expect(isValidImageType(mimeType)).toBe(false)
    },
  )
})

describe('validImageExtensions', () => {
  it('lists every accepted extension', () => {
    expect(validImageExtensions()).toEqual([
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
    ])
  })
})

describe('loadImageAsDataUrl', () => {
  // INFO: jsdom provides a real FileReader (jest.setup.js only fills one in
  // when it is missing), so a Blob comes back base64-encoded for real.
  // jest.setup.js's global fetch only answers data: URLs — the URL cases
  // below replace it for the duration of the test.
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('passes a data URL through untouched', async () => {
    await expect(loadImageAsDataUrl(PNG_DATA_URL)).resolves.toBe(PNG_DATA_URL)
  })

  it('reads a Blob as a data URL', async () => {
    const blob = new Blob(['image-bytes'], { type: 'image/png' })

    const result = await loadImageAsDataUrl(blob)

    expect(result).toBe('data:image/png;base64,aW1hZ2UtYnl0ZXM=')
  })

  it('reads a typeless Blob without complaining about its MIME type', async () => {
    const blob = new Blob(['image-bytes'])

    await expect(loadImageAsDataUrl(blob)).resolves.toBe(
      'data:application/octet-stream;base64,aW1hZ2UtYnl0ZXM=',
    )
  })

  it('rejects a Blob with an unsupported MIME type', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' })

    const error = await expectDigitizerError(
      loadImageAsDataUrl(blob),
      'INVALID_IMAGE_TYPE',
    )
    expect(error.message).toContain('png')
  })

  describe('URL sources', () => {
    it('fetches the URL with credentials and converts the response', async () => {
      const blob = new Blob(['image-bytes'], { type: 'image/png' })
      const fetchMock = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(blob),
        }),
      )
      global.fetch = fetchMock as unknown as typeof fetch

      const result = await loadImageAsDataUrl('https://example.com/graph.png')

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/graph.png', {
        credentials: 'include',
      })
      expect(result).toBe('data:image/png;base64,aW1hZ2UtYnl0ZXM=')
    })

    it('reports IMAGE_LOAD_FAILED when the response is not ok', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          blob: () => Promise.resolve(new Blob()),
        }),
      ) as unknown as typeof fetch

      const error = await expectDigitizerError(
        loadImageAsDataUrl('https://example.com/missing.png'),
        'IMAGE_LOAD_FAILED',
      )
      expect(error.message).toContain('404')
    })

    it('reports IMAGE_LOAD_FAILED when the fetch itself throws', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('network down')),
      ) as unknown as typeof fetch

      const error = await expectDigitizerError(
        loadImageAsDataUrl('https://example.com/graph.png'),
        'IMAGE_LOAD_FAILED',
      )
      expect(error.message).toContain('Failed to fetch image')
      expect((error.cause as Error).message).toBe('network down')
    })

    it('rejects a fetched body with an unsupported MIME type', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: () =>
            Promise.resolve(new Blob(['<svg/>'], { type: 'image/svg+xml' })),
        }),
      ) as unknown as typeof fetch

      await expectDigitizerError(
        loadImageAsDataUrl('https://example.com/graph.svg'),
        'INVALID_IMAGE_TYPE',
      )
    })
  })
})

describe('dataUrlToBlob', () => {
  it('converts a data URL into a Blob', async () => {
    const blob = await dataUrlToBlob(PNG_DATA_URL)

    expect(blob).toBeInstanceOf(Blob)
  })
})
