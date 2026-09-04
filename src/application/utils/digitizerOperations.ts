import { DigitizerContext } from '@/application/digitizerContext'
import { ProjectDTO, createEmptyProject } from '@/application/dto/projectDTO'
import { DigitizerError } from '@/application/errors'
import {
  ImageSource,
  loadImageAsDataUrl,
} from '@/application/utils/imageLoader'
import { POINT_MODE } from '@/constants'

// INFO: The operations that touch several services at once (image + repos +
// history + canvas). Every entry point — file input, drag&drop, paste, the
// ZIP "Load Project" menu and the host-facing props/methods — funnels through
// here so all of them behave identically.

/**
 * Decode `source` and draw it on the canvas. Does NOT touch axis/dataset
 * state; callers decide whether the data survives (see replaceImage /
 * loadProject).
 */
export async function applyImage(
  ctx: DigitizerContext,
  source: ImageSource,
): Promise<string> {
  const dataUrl = await loadImageAsDataUrl(source)
  try {
    await ctx.canvasHandler.initializeImageElement(dataUrl)
  } catch (error) {
    throw new DigitizerError(
      'IMAGE_LOAD_FAILED',
      'The browser could not decode the image',
      error,
    )
  }
  ctx.canvasHandler.drawFitSizeImage()
  ctx.canvasHandler.setUploadImageUrl(dataUrl)
  ctx.extractor.setSwatches(ctx.canvasHandler.colorSwatches)
  if (ctx.interpolator.isActive) {
    ctx.interpolator.clearPreview()
  }
  ctx.interpolator.resizeCanvas()
  return dataUrl
}

/**
 * User replaced the image: draw it and start over (axis coordinates,
 * datasets and undo history are dropped, as they belong to the old image).
 */
export async function replaceImage(
  ctx: DigitizerContext,
  source: ImageSource,
): Promise<string> {
  const dataUrl = await applyImage(ctx, source)
  clearData(ctx)
  return dataUrl
}

function clearData(ctx: DigitizerContext): void {
  ctx.axisSetRepository.axisSets.forEach((axisSet) => {
    axisSet.clearAxisCoords()
  })
  ctx.datasetRepository.clearAllDatasets()
  ctx.datasetRepository.createNewDataset()
  ctx.datasetRepository.setActiveDataset(ctx.datasetRepository.lastDatasetId)
  // INFO: undo/redo history is scoped to axisSets/datasets on the current
  // image (see docs/design/ux-ideas-implementation-design.md) — snapshots
  // from the previous image no longer make sense once the image changed.
  ctx.historyManager.clear()
}

/**
 * Restore a saved project. Used by both the ZIP path (after
 * projectService.importProject) and the host API path (ProjectDTO handed in
 * directly), so the two can never diverge.
 */
export async function loadProject(
  ctx: DigitizerContext,
  project: ProjectDTO,
  image?: ImageSource,
): Promise<void> {
  if (image !== undefined) {
    await applyImage(ctx, image)
  }

  ctx.projectService.restoreProject(project)

  // INFO: Restored axis sets are shown in 4-points mode so every saved
  // coordinate is visible/editable. Uncalibrated sets (e.g. the empty
  // project used for a fresh mount) keep the 2-points default.
  ctx.axisSetRepository.axisSets.forEach((axisSet) => {
    if (axisSet.hasAtLeastOneAxis) {
      axisSet.pointMode = POINT_MODE.FOUR_POINTS
    }
  })

  // INFO: fit LAST, after the restore, so the canvas size and
  // canvasHandler.scale are settled together and every overlay below draws at
  // the same factor. Order matters: applyImage() already fits, but that
  // happens before restoreProject(), and a project restore is a whole-state
  // swap — the zoom that was on screen a moment ago belongs to the previous
  // figure, and the saved DTO cannot supply one (see canvasHandlerDTO.scale).
  //
  // Safe on the image-less path too (`image` omitted and nothing loaded yet):
  // drawFitSizeImage() returns immediately while originalWidth/Height are 0,
  // and it also bails out when the canvases are not attached, so neither
  // `scale` nor the canvases are touched. Once an image does arrive,
  // applyImage() fits it.
  ctx.canvasHandler.drawFitSizeImage()

  if (ctx.interpolator.isActive) {
    ctx.interpolator.clearPreview()
  }
  // INFO: after the fit, so the guide canvas is sized with the final scale.
  ctx.interpolator.resizeCanvas()
  ctx.historyManager.clear()
}

/**
 * Discard everything: image, axes, points, history. The component is left in
 * the same state as a fresh mount.
 */
export function reset(ctx: DigitizerContext): void {
  ctx.projectService.restoreProject(createEmptyProject())
  ctx.canvasHandler.clearImage()
  if (ctx.interpolator.isActive) {
    ctx.interpolator.clearPreview()
  }
  ctx.historyManager.clear()
}
