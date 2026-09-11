import { ProjectDTO } from '@/application/dto/projectDTO'

export interface ProjectServiceInterface {
  /**
   * A number that changes whenever anything `toProjectDTO()` would report
   * changes — a point plotted or moved, a dataset renamed or linked, an axis
   * value, a log scale, the point mode, an undo, a restore. It is reactive:
   *
   *   watch(() => ctx.projectService.revision, save)   // Vue
   *   effect(() => { ctx.projectService.revision; save() })  // core's effect
   *
   * WHAT IT PROMISES: while it does not change, the project has not changed,
   * so a host can hold off serialising until it does. That is the whole
   * point — the alternative is `JSON.stringify(toProjectDTO())` on every tick
   * just to find out whether anything happened.
   *
   * WHAT IT DOES NOT PROMISE:
   * - It is NOT a version number of the project. Do not persist it, do not
   *   send it to a server, do not compare one taken from another mount: every
   *   context starts its own count, and a reload of the same project gives a
   *   completely different value.
   * - The step is meaningless. It may move by one for a hundred edits made in
   *   the same tick — it is read lazily — and it never runs backwards, not
   *   even on undo.
   * - A change means "may have changed", not "definitely changed". An
   *   operation that rewrites an array with equal contents moves it too, so a
   *   host that must not write an identical project (v-model echo, ETags)
   *   still compares the serialised DTO before saving — but now only when
   *   `revision` says it is worth looking.
   */
  get revision(): number

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
