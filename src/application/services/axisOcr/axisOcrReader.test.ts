// INFO: regression test for the #42 bug: Tesseract.recognize(image, langs)
// (the convenience top-level function) only ever populates `data.text` by
// default (tesseract.js's own default output format is `{ text: true }`,
// see node_modules/tesseract.js/src/createWorker.js) — `data.blocks` stays
// null unless the caller explicitly asks for the `blocks` output. Since
// flattenOcrWords() walks blocks > paragraphs > lines > words, calling
// recognize() without requesting blocks silently yields zero OCR words on
// every environment (this reproduced locally too, not just on Vercel).

const mockRecognize = jest.fn()
const mockTerminate = jest.fn().mockResolvedValue(undefined)
const mockCreateWorker = jest.fn().mockResolvedValue({
  recognize: (...args: unknown[]) => mockRecognize(...args),
  terminate: (...args: unknown[]) => mockTerminate(...args),
})

// INFO: tesseract.js is loaded with `await import('tesseract.js')` (lazy, so
// the WASM runtime stays out of the initial bundle). ts-jest compiles that
// down to a require(), so this factory still intercepts it; the package is
// CJS with named exports, hence `createWorker` and no `default`.
jest.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AxisOcrReader } = require('./axisOcrReader')

describe('AxisOcrReader', () => {
  beforeEach(() => {
    mockRecognize.mockReset()
    mockTerminate.mockClear()
    mockCreateWorker.mockClear()
  })

  test('requests the "blocks" output format so word bounding boxes are populated', async () => {
    mockRecognize.mockResolvedValue({ data: { blocks: null } })
    const reader = new AxisOcrReader()

    await reader.readWords({} as HTMLImageElement)

    expect(mockRecognize).toHaveBeenCalledWith(
      {},
      {},
      expect.objectContaining({ blocks: true }),
    )
  })

  test('flattens the recognized page into OcrWord[]', async () => {
    const word = { text: '42', bbox: { x0: 1, y0: 2, x1: 3, y1: 4 } }
    mockRecognize.mockResolvedValue({
      data: {
        blocks: [{ paragraphs: [{ lines: [{ words: [word] }] }] }],
      },
    })
    const reader = new AxisOcrReader()

    const words = await reader.readWords({} as HTMLImageElement)

    expect(words).toStrictEqual([word])
  })

  test('terminates the worker after recognizing, even on failure', async () => {
    mockRecognize.mockRejectedValue(new Error('boom'))
    const reader = new AxisOcrReader()

    await expect(reader.readWords({} as HTMLImageElement)).rejects.toThrow(
      'boom',
    )
    expect(mockTerminate).toHaveBeenCalled()
  })

  test('lets tesseract.js resolve its own asset paths when no assetBaseUrl is given', async () => {
    mockRecognize.mockResolvedValue({ data: { blocks: null } })

    await new AxisOcrReader().readWords({} as HTMLImageElement)

    expect(mockCreateWorker).toHaveBeenCalledWith('eng', undefined, undefined)
  })

  test('forwards assetBaseUrl as the worker/core/lang paths, without a duplicated slash', async () => {
    mockRecognize.mockResolvedValue({ data: { blocks: null } })

    await new AxisOcrReader('https://cdn.example.com/tesseract/').readWords(
      {} as HTMLImageElement,
    )

    expect(mockCreateWorker).toHaveBeenCalledWith('eng', undefined, {
      workerPath: 'https://cdn.example.com/tesseract/worker.min.js',
      corePath: 'https://cdn.example.com/tesseract/',
      langPath: 'https://cdn.example.com/tesseract',
    })
  })
})
