import { DigitizerContext } from '@/application/digitizerContext'
import { Coord } from '@/@types/types'

// INFO: The point-level use cases that ADD, REPLACE OR REMOVE points the user
// cannot get back by repeating the gesture: automatic extraction (it throws
// the whole dataset away and refills it), confirming an interpolation (the
// anchor points are consumed) and deleting a single point.
//
// NOTE (historyManager.capture): same reasoning as
// `datasetOperations.ts` — `docs/design/architecture.md` §6.2 records the old
// convention "capture の呼び出しは Presentation 層の責務とする" and also names
// its cost ("呼び忘れると履歴が飛ぶ"). All three of these were exactly that
// bug: the components ran the mutation and never captured, so hundreds of
// extracted points, a confirmed interpolation and a click-deleted point were
// all unrecoverable. The snapshot is therefore taken where the mutation is,
// not where the click is, and a host that replaces <ExtractorSettings> or the
// point overlay with its own UI gets undo for free instead of having to know
// which gestures are capture points.
//
// What is NOT here on purpose: the "you need 2 or more anchor points" alert
// and the "extraction failed" message. Wording, modality and i18n are
// presentation decisions — `confirmInterpolation()` reports the refusal as a
// boolean and `extractPoints()` lets the error out, and the caller decides how
// to say it.

/**
 * Plot one point on the active dataset — the ADD-mode click, in ORIGINAL IMAGE
 * pixels (divide the click position by `canvasHandler.scale` first).
 *
 * Adding a point is three mutations, not one, and only the first is obvious:
 *
 * 1. `addPoint()` — the point itself, under the undo snapshot.
 * 2. `inactivateAxis()` — plotting ends any axis-marker edit, so an arrow key
 *    afterwards nudges the point and not the axis that was last touched.
 * 3. `addManuallyAddedPointId()` — registers it as an interpolation ANCHOR.
 *    Skipping this is silent: `confirmInterpolation()` refuses while there are
 *    fewer than two anchors and reports the refusal as a `false`, so a host
 *    that plotted points by hand would find interpolation permanently
 *    unusable with no error raised anywhere.
 *
 * What is NOT here, because the caller owns it: whether plotting is allowed at
 * all (`options.readonly`, view-all mode, an active mask tool), whether the
 * coordinate is inside the image, and refreshing the interpolation preview
 * afterwards (`interpolator.updatePreview()`) — the preview is presentation
 * state the engine does not decide to show.
 *
 * @returns the id of the point that was added.
 */
export function addPoint(ctx: DigitizerContext, coord: Coord): number {
  const { axisSetRepository, datasetRepository, historyManager } = ctx

  historyManager.capture()

  const activeDataset = datasetRepository.activeDataset
  activeDataset.addPoint(coord.xPx, coord.yPx)
  axisSetRepository.activeAxisSet.inactivateAxis()
  activeDataset.addManuallyAddedPointId(activeDataset.lastPointId)

  return activeDataset.lastPointId
}

/**
 * Automatic extraction ("Run"): replace every point in the active dataset
 * with the algorithm's output.
 *
 * ORDER IS PART OF THE CONTRACT: the algorithm runs BEFORE `capture()`.
 * `extractor.execute()` only reads pixels — it mutates nothing — so running it
 * first means a failing extraction leaves neither points nor a useless
 * "nothing changed" entry on the undo stack.
 *
 * @throws whatever the extraction strategy throws (e.g. no image loaded).
 */
export function extractPoints(ctx: DigitizerContext): void {
  const {
    axisSetRepository,
    canvasHandler,
    datasetRepository,
    extractor,
    historyManager,
  } = ctx

  // INFO: the canvas handler is passed here as a PixelSource
  const coords = extractor.execute(canvasHandler)

  historyManager.capture()

  axisSetRepository.activeAxisSet.inactivateAxis()
  datasetRepository.setPoints(coords)
  datasetRepository.sortPoints()
}

/**
 * Confirm the interpolation preview: turn every tempPoint into a real point
 * and consume the anchor points that produced them.
 *
 * @returns false when there is nothing to confirm (fewer than two anchor
 * points). Nothing is captured or mutated in that case, so the caller is free
 * to tell the user whichever way it likes.
 */
export function confirmInterpolation(ctx: DigitizerContext): boolean {
  const { datasetRepository, interpolator, historyManager } = ctx

  const activeDataset = datasetRepository.activeDataset
  if (activeDataset.manuallyAddedPointIds.length < 2) {
    return false
  }

  historyManager.capture()

  activeDataset.tempPoints.forEach((tempPoint) => {
    activeDataset.moveTempPointToPoint(tempPoint.id)
  })
  activeDataset.manuallyAddedPointIds.forEach((pointId) => {
    activeDataset.clearPoint(pointId)
  })

  activeDataset.switchActivatedPoint(activeDataset.lastPointId)

  interpolator.clearPreview()
  return true
}

/**
 * Delete one point of the active dataset (the DELETE-mode click).
 *
 * INFO: the keyboard path (Backspace/Delete on the selection) has always
 * captured; the click path had not, so the same deletion was undoable or not
 * depending on how it was asked for. Both go through a capture now.
 *
 * INFO: unknown ids are ignored rather than captured — a click on a point that
 * is already gone must not push an entry that undoes the previous edit.
 */
export function deletePoint(ctx: DigitizerContext, pointId: number): void {
  const { datasetRepository, interpolator, historyManager } = ctx

  const activeDataset = datasetRepository.activeDataset
  if (!activeDataset.points.some((point) => point.id === pointId)) {
    return
  }

  historyManager.capture()
  activeDataset.clearPoint(pointId)

  // INFO: deleting an anchor point changes the curve, so the preview has to be
  // recomputed. Harmless when the point was not an anchor.
  if (interpolator.isActive) {
    interpolator.updatePreview()
  }
}
