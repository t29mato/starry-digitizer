import { DigitizerContext } from '@/application/digitizerContext'
import { createEmptyProject } from '@/application/dto/projectDTO'
import {
  fromAxisSetDTO,
  fromDatasetDTO,
  toAxisSetDTO,
  toDatasetDTO,
} from '@/application/dto/converters'
import { endReview } from '@/application/utils/autoExtractionOperations'
import { MASK_MODE } from '@/constants'

// INFO: "Start over" for the figure on screen (wpd-auto's Start over;
// docs/design/starryai-auto.md F12): the axes, every dataset and the
// automatic features' leftovers go, the IMAGE STAYS. It is not the standalone
// app's File > Start Over, which also drops the image and the auto-saved copy
// (App.vue handleStartOver) and is not undoable.
//
// Same rules as the other use cases (axisSetOperations.ts,
// datasetOperations.ts): the undo snapshot is taken HERE, before anything is
// changed, and the confirmation stays with the caller.

/** The undo / research-event action name of startOver(). */
export const START_OVER_ACTION = 'project.start-over'

// INFO: what a fresh mount holds, through the same DTO round trip the
// current state takes, so fields a converter fills in (colours, defaults)
// cannot make a fresh project look "changed"
function freshState(): string {
  const empty = createEmptyProject()
  return JSON.stringify({
    axisSets: empty.axisSets.map((dto) => toAxisSetDTO(fromAxisSetDTO(dto))),
    datasets: empty.datasets.map((dto) => toDatasetDTO(fromDatasetDTO(dto))),
  })
}

function currentState(ctx: DigitizerContext): string {
  return JSON.stringify({
    axisSets: ctx.axisSetRepository.axisSets.map(toAxisSetDTO),
    datasets: ctx.datasetRepository.datasets.map(toDatasetDTO),
  })
}

/**
 * True when startOver() would change something: axes or datasets differ from
 * a fresh project, a review is running or an Auto-place proposal is waiting.
 */
export function canStartOver(ctx: DigitizerContext): boolean {
  return (
    ctx.reviewSession.isActive ||
    ctx.autoFeatures.proposal !== null ||
    currentState(ctx) !== freshState()
  )
}

/**
 * Clear everything digitized on the current image and keep the image:
 *
 * - every axis set → the one empty `XY Axes 1` of a fresh project (no
 *   coordinates, values 0/1, linear, 2-point mode);
 * - every dataset → the one empty `dataset 1`;
 * - the auto-extraction review (reviewSession, the change overlay) and the
 *   Review Points cursor;
 * - the Auto-place proposal waiting to be applied;
 * - the interpolation preview and the mask (they belong to the old datasets).
 *
 * ONE undo step (`project.start-over`), which also reaches the research hook
 * as an `edit` event. ⌘Z brings the axes and datasets back. It does NOT bring
 * back the review or the proposal: neither is part of the undo snapshot (the
 * same as for every other edit — see HistoryManager), and the review's edit
 * log ends here (`review.end` is emitted).
 *
 * Does nothing and returns false when there is nothing to clear, so a second
 * click leaves no empty undo step.
 */
export function startOver(ctx: DigitizerContext): boolean {
  if (!canStartOver(ctx)) return false
  const { canvasHandler, historyManager, interpolator, projectService } = ctx

  // INFO: captured first: the snapshot must hold the state being thrown
  // away, and the review's own log records the action before it ends
  historyManager.capture(START_OVER_ACTION)

  // INFO: clearPreview() works on the ACTIVE dataset, so it runs while that
  // is still the user's dataset (see datasetOperations.activateDataset)
  if (interpolator.isActive) {
    interpolator.clearPreview()
  }
  endReview(ctx)
  ctx.confidenceReview.setCurrent(null)
  ctx.autoFeatures.clearProposal()

  // INFO: the same restore a fresh mount and "Load Project" go through, so
  // ids, names and the active axis set / dataset match a new project. The
  // image and the zoom are untouched (restoreProject never sets `scale`);
  // the plot mode goes back to "none", as on a fresh mount, because the
  // axes have to be placed again first.
  projectService.restoreProject(createEmptyProject())

  if (canvasHandler.hasCanvases) {
    canvasHandler.clearMask()
  }
  canvasHandler.setMaskMode(MASK_MODE.UNSET)
  return true
}
