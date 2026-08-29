export interface PdfPageRendererInterface {
  /**
   * Render the first page of a PDF file to a `data:image/png;base64,...`
   * URL — the same shape FileReader.readAsDataURL() produces for images, so
   * it can be dropped straight into the existing image-loading pipeline.
   */
  renderFirstPageAsDataUrl(file: File): Promise<string>
}
