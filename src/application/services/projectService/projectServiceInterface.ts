import { ProjectDTO } from '@/application/dto/projectDTO'

export interface ProjectServiceInterface {
  /**
   * Snapshot the current axisSets/datasets/canvas state as a ProjectDTO.
   * The image is not part of the DTO; hosts keep it separately.
   */
  toProjectDTO(): ProjectDTO

  /**
   * Restore application state from a ProjectDTO. The DTO is passed through
   * migrateProject() first, so older schema versions are accepted.
   * Does not touch the canvas image — see digitizerOperations.loadProject.
   */
  restoreProject(project: ProjectDTO): void

  /**
   * Export current application state as a ZIP file
   * @returns Blob containing the ZIP file
   */
  exportProject(): Promise<Blob>

  /**
   * Import project from a ZIP file
   * @param zipFile - The ZIP file to import
   * @returns ProjectDTO (migrated to the current schema) and image data URL
   */
  importProject(zipFile: File): Promise<{
    projectData: ProjectDTO
    imageData: string
  }>
}
