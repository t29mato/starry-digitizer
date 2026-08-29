// INFO: docs/design/pdf-import-design.md — pure, dependency-free file-type
// detection so ImageSettings.vue can branch on "is this a PDF?" without
// pulling pdfjs-dist into scope just to answer that question.

export const isPdfFile = (file: File): boolean => {
  if (file.type === 'application/pdf') {
    return true
  }
  // INFO: fall back to the extension when the browser/OS didn't report a
  // MIME type (observed for some file pickers/drag sources).
  if (file.type === '') {
    return file.name.toLowerCase().endsWith('.pdf')
  }
  return false
}
