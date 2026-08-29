// INFO: regression test in the spirit of axisOcrReader.test.ts (HQ #42) —
// mocks pdfjs-dist to pin down the *contract* we depend on (page 1 is
// requested, a 2D canvas context is rendered into, and the result comes
// back via canvas.toDataURL). The real rendering pipeline still needs a
// one-time manual check on the Vercel preview per docs/design/
// pdf-import-design.md, since Jest/jsdom can't meaningfully execute
// pdfjs-dist's canvas rendering.

jest.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => 'mock-worker-url', {
  virtual: true,
})

const mockRender = jest.fn().mockReturnValue({ promise: Promise.resolve() })
const mockGetViewport = jest.fn().mockReturnValue({ width: 100, height: 200 })
const mockDestroy = jest.fn().mockResolvedValue(undefined)
const mockGetPage = jest.fn().mockResolvedValue({
  getViewport: (...args: unknown[]) => mockGetViewport(...args),
  render: (...args: unknown[]) => mockRender(...args),
})
// INFO: getDocument() returns a PDFDocumentLoadingTask synchronously —
// .destroy() lives on that task, not on the PDFDocumentProxy .promise
// resolves to (see pdfPageRenderer.ts's INFO comment for why).
const mockGetDocument = jest.fn().mockReturnValue({
  promise: Promise.resolve({
    getPage: (...args: unknown[]) => mockGetPage(...args),
  }),
  destroy: (...args: unknown[]) => mockDestroy(...args),
})

jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PdfPageRenderer } = require('./pdfPageRenderer')

// INFO: jsdom's File polyfill doesn't implement arrayBuffer() (real
// browsers do). Patch it in for this test only.
const makePdfFile = (): File => {
  const file = new File(['dummy pdf bytes'], 'graph.pdf', {
    type: 'application/pdf',
  })
  if (!file.arrayBuffer) {
    file.arrayBuffer = async () => new ArrayBuffer(8)
  }
  return file
}

describe('PdfPageRenderer', () => {
  beforeEach(() => {
    mockGetDocument.mockClear()
    mockGetPage.mockClear()
    mockGetViewport.mockClear()
    mockRender.mockClear()
    mockDestroy.mockClear()
  })

  test('renders page 1 and returns the canvas as a data URL', async () => {
    const toDataURLSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue('data:image/png;base64,mock')

    const renderer = new PdfPageRenderer()
    const file = makePdfFile()

    const dataUrl = await renderer.renderFirstPageAsDataUrl(file)

    expect(mockGetDocument).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(ArrayBuffer) }),
    )
    expect(mockGetPage).toHaveBeenCalledWith(1)
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasContext: expect.anything(),
        viewport: { width: 100, height: 200 },
      }),
    )
    expect(dataUrl).toBe('data:image/png;base64,mock')

    toDataURLSpy.mockRestore()
  })

  test('destroys the pdf document even if rendering fails', async () => {
    // INFO: build the rejected promise lazily, inside the mock
    // implementation, so it's created (and immediately awaited) in the same
    // tick — constructing it eagerly here would leave it unhandled for a
    // tick and crash the test process.
    mockRender.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('boom')),
    }))

    const renderer = new PdfPageRenderer()
    const file = makePdfFile()

    await expect(renderer.renderFirstPageAsDataUrl(file)).rejects.toThrow(
      'boom',
    )
    expect(mockDestroy).toHaveBeenCalled()
  })
})
