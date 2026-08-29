import { isPdfFile } from './fileTypeUtils'

const makeFile = (name: string, type: string): File =>
  new File(['dummy'], name, { type })

describe('fileTypeUtils', () => {
  describe('isPdfFile', () => {
    test('returns true when the MIME type is application/pdf', () => {
      expect(isPdfFile(makeFile('graph.pdf', 'application/pdf'))).toBe(true)
    })

    test('returns true when the MIME type is empty but the extension is .pdf', () => {
      // INFO: some OSes/browsers report an empty type for files they don't
      // recognize (observed for .pdf on some Linux file pickers).
      expect(isPdfFile(makeFile('graph.pdf', ''))).toBe(true)
    })

    test('is case-insensitive on the extension fallback', () => {
      expect(isPdfFile(makeFile('graph.PDF', ''))).toBe(true)
    })

    test('returns false for image files', () => {
      expect(isPdfFile(makeFile('graph.png', 'image/png'))).toBe(false)
    })

    test('returns false when neither MIME type nor extension indicate a PDF', () => {
      expect(isPdfFile(makeFile('graph.docx', ''))).toBe(false)
    })
  })
})
