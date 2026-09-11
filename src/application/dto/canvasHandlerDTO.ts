import { ManualMode } from '@/@types/types'

/**
 * DTO (Data Transfer Object) for CanvasHandler
 * Plain data representation for serialization/deserialization
 * This type contains only data properties needed for project persistence
 */
export interface CanvasHandlerDTO {
  /**
   * WRITE-ONLY. `toProjectDTO()` still fills this in (dropping the field would
   * be a breaking schema change), but nothing reads it back:
   * `ProjectService.restoreProject()` deliberately ignores it.
   *
   * `scale` is the fit factor of the image against the *current* canvas frame,
   * so it only means anything in the viewport it was measured in. A host that
   * saves the DTO and reopens it at another window size would otherwise get an
   * image drawn at the new fit size with the points, axis markers and
   * interpolation guide drawn at the old factor. The fit is recomputed on load
   * instead — see digitizerOperations.loadProject().
   */
  scale: number
  manualMode: ManualMode
}
