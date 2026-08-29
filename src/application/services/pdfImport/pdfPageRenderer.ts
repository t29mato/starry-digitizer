import { PdfPageRendererInterface } from './pdfPageRendererInterface'

// INFO: how many CSS pixels per PDF "point" to render at. PDF pages are
// authored at 72 points/inch; rendering at 1x would produce a blurry,
// low-resolution source image for digitizing. 2x roughly matches a
// print-quality scan.
const RENDER_SCALE = 2

export class PdfPageRenderer implements PdfPageRendererInterface {
  async renderFirstPageAsDataUrl(file: File): Promise<string> {
    // INFO: dynamic imports, deliberately NOT top-level static imports.
    // pdfjs-dist@6's own bundle references JS engine features (the
    // `Iterator` helpers) that aren't available in every browser engine
    // still in the wild (e.g. it crashed the whole app — not just PDF
    // import — under Cypress's bundled Electron 106 with a top-level
    // `ReferenceError: Iterator is not defined`, discovered by actually
    // running the E2E suite before shipping, per the HQ #42 lesson).
    // Deferring the import to only when a user actually uploads a PDF
    // keeps that risk scoped to this one feature instead of taking down
    // the whole app for anyone on an older browser, and keeps pdfjs-dist
    // out of the main bundle for everyone who never touches this feature.
    const [pdfjsLib, pdfWorkerSrcModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrcModule.default

    const data = await file.arrayBuffer()
    // INFO: getDocument() returns a PDFDocumentLoadingTask synchronously —
    // .destroy() (worker/network cleanup) lives on that task, not on the
    // PDFDocumentProxy .promise resolves to.
    const loadingTask = pdfjsLib.getDocument({ data })
    try {
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: RENDER_SCALE })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) {
        throw new Error('Failed to get a 2D canvas context for PDF rendering')
      }

      await page.render({ canvasContext, canvas, viewport }).promise
      return canvas.toDataURL('image/png')
    } finally {
      await loadingTask.destroy()
    }
  }
}
