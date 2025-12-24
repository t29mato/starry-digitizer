import { ProjectDTO } from '@/application/dto/projectDTO'

export interface ProjectServiceInterface {
  /**
   * Export current application state as a ZIP file
   * @returns Blob containing the ZIP file
   */
  exportProject(): Promise<Blob>

  /**
   * Import project from a ZIP file
   * @param zipFile - The ZIP file to import
   * @returns ProjectDTO and image data
   */
  importProject(zipFile: File): Promise<{
    projectData: ProjectDTO
    imageData: string
  }>

  /**
   * Download ZIP file to user's computer
   * @param zipBlob - The ZIP blob to download
   * @param filename - Optional filename (auto-generated if not provided)
   */
  downloadZip(zipBlob: Blob, filename?: string): void

  /**
   * Load project from ZIP file and restore application state
   * @param zipFile - The ZIP file to load
   * @returns Image data URL for canvas initialization
   */
  loadProject(zipFile: File): Promise<string>
}
