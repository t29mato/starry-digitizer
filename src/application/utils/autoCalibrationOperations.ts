import { DigitizerContext } from '@/application/digitizerContext'
import {
  AutoAxisName,
  AutoCalibrationProposal,
  parseCalibrationResponse,
} from '@/application/services/autoService/autoServiceWire'
import {
  bindToCurrentImage,
  requireAutoFeature,
} from '@/application/utils/autoFeatureOperations'
import { fitAxisTicks } from '@/domain/services/axisTickFitter'
import { barIndexReferences } from '@/domain/services/barIndexAxis'
import { CalibrationPlot } from '@/application/services/autoService/autoService'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { Rect } from '@/@types/types'
import { POINT_MODE } from '@/constants'

// INFO: Axis Auto-place (Starrydata2 v4 board P1): the backend reads the tick
// labels and proposes a calibration; the user looks at it and applies it —
// or does not. Two steps on purpose: the backend is wrong sometimes (its own
// README counts the figures it misreads), and a calibration nobody looked at
// silently skews every value read off the figure.
//
// 1. requestAutoCalibration() asks the service and keeps the answer as a
//    PROPOSAL (ctx.autoFeatures.proposal). Nothing in the project changes.
// 2. applyAutoCalibration() turns the proposal into x1/x2/y1/y2 of the active
//    axis set, as one undo step ('axis.auto-place'). The reference points
//    are ordinary axis markers afterwards: draggable, nudgeable, editable.

/**
 * Ask the service to calibrate the loaded image and keep the answer as the
 * pending proposal for the active axis set.
 *
 * `signal` cancels the request; an answer that comes after it was aborted,
 * or after the image changed, is dropped (isImageChangedError()).
 *
 * @throws DigitizerError('AUTO_SERVICE_FAILED') when the feature is not
 * available, no image is loaded, or the service fails.
 */
export async function requestAutoCalibration(
  ctx: DigitizerContext,
  signal?: AbortSignal,
  plot: CalibrationPlot = 'xy',
): Promise<AutoCalibrationProposal> {
  const proposal = await calibrateCurrentImage(ctx, signal, plot)
  ctx.autoFeatures.setProposal(proposal, ctx.axisSetRepository.activeAxisSetId)
  return proposal
}

/**
 * The service's calibration of the loaded image, without keeping it as a
 * proposal (Auto-fill values uses it for the points the person placed).
 * Same errors as requestAutoCalibration().
 *
 * `plot: 'bar'` asks for a bar plot's value axis (`?plot=bar`, feature
 * `auto_axis_bar`).
 */
export async function calibrateCurrentImage(
  ctx: DigitizerContext,
  signal?: AbortSignal,
  plot: CalibrationPlot = 'xy',
): Promise<AutoCalibrationProposal> {
  const service = requireAutoFeature(
    ctx,
    plot === 'bar' ? 'auto_axis_bar' : 'auto_axis',
  )
  const { image, settle } = bindToCurrentImage(ctx, signal)
  // INFO: an X-Y request is made exactly as before bar plots existed
  const options = {
    ...(signal ? { signal } : {}),
    ...(plot === 'bar' ? { plot } : {}),
  }
  let body: unknown
  try {
    body = await (Object.keys(options).length > 0
      ? service.calibrate(image, options)
      : service.calibrate(image))
  } catch (error) {
    settle()
    throw error
  }
  settle()
  return parseCalibrationResponse(body)
}

// INFO: the backend's failure codes (wpd-auto backend README, MIT), in the
// words the panels show. Shared by Axis Auto-place and Auto digitize.
const AXIS_FAILURE_TEXT: Record<string, string> = {
  no_axis_frame: 'no axis frame found',
  axes_not_calibrated: 'axes could not be calibrated',
  no_labels_read: 'no tick labels could be read',
  too_few_labels: 'too few tick labels read',
  no_consistent_fit: 'tick labels do not fit a scale',
  // INFO: a bar plot's x is not read (BarRulerNet); it becomes the bar index
  not_read_bar_plot: 'not read on a bar plot (x = bar index)',
  no_value_axis_read: 'no value axis could be read',
}

/** A failure code of the calibration answer, in words. */
export function describeAxisFailure(reason: string | null): string {
  const code = reason ?? 'unknown'
  return AXIS_FAILURE_TEXT[code] ?? code
}

/** Drop the pending proposal without touching the axes. */
export function discardAutoCalibration(ctx: DigitizerContext): void {
  ctx.autoFeatures.clearProposal()
}

/**
 * Apply a proposal to the active axis set: the usable axes among `axes` get
 * their two reference points at the smallest and largest tick value, on the
 * least-squares line through all ticks (so one misplaced tick is averaged
 * out rather than taken as a reference). The plot frame becomes the axis
 * set's plot area when it has none yet.
 *
 * `action` names the undo step; Auto digitize passes its own, because the
 * axes are the first half of ITS one step (autoDigitizeOperations.ts).
 *
 * @returns the axes that were applied. Nothing is captured when none was
 * usable.
 */
export function applyAutoCalibration(
  ctx: DigitizerContext,
  proposal: AutoCalibrationProposal | null = ctx.autoFeatures.proposal,
  axes: AutoAxisName[] = ['x', 'y'],
  action = 'axis.auto-place',
): AutoAxisName[] {
  if (!proposal) return []
  const usable = axes.filter((name) => proposal[name].ok)
  if (usable.length === 0) return []

  ctx.historyManager.capture(action)
  placeAxes(ctx, proposal, usable)
  return usable
}

// INFO: the part of an Apply after its capture: the axes, four-points mode,
// the plot area, and the proposal is done with
function placeAxes(
  ctx: DigitizerContext,
  proposal: AutoCalibrationProposal,
  usable: AutoAxisName[],
): void {
  const axisSet = ctx.axisSetRepository.activeAxisSet
  if (usable.includes('x')) applyXAxis(axisSet, proposal)
  if (usable.includes('y')) applyYAxis(axisSet, proposal)

  // INFO: four independent reference points — that is what a tick fit
  // produces, and two-points mode would tie x2 and y2 together
  axisSet.pointMode = POINT_MODE.FOUR_POINTS
  axisSet.inactivateAxis()
  if (proposal.frame && !axisSet.plotArea) {
    axisSet.plotArea = { ...proposal.frame }
  }
  ctx.autoFeatures.clearProposal()
}

/**
 * Apply a BAR plot's proposal to the active axis set: its value (y) axis
 * from the ticks, and its x axis as the bar index (0, 1, 2, … from the
 * left; docs/design/starryai-auto.md §10 Q7) through `barCentresPx`, the
 * bars' x positions. Without bars the x axis is left as it is. One undo
 * step, as applyAutoCalibration(); nothing happens when the value axis is
 * not usable.
 *
 * @returns the axes that were applied ('x' only when there were bars)
 */
export function applyBarAutoCalibration(
  ctx: DigitizerContext,
  barCentresPx: number[],
  proposal: AutoCalibrationProposal | null = ctx.autoFeatures.proposal,
  action = 'axis.auto-place',
): AutoAxisName[] {
  if (!proposal || !proposal.y.ok) return []
  ctx.historyManager.capture(action)
  placeAxes(ctx, proposal, ['y'])
  const placed = setBarIndexXAxis(ctx, barCentresPx, proposal.frame)
  return placed ? ['x', 'y'] : ['y']
}

/**
 * Make the active axis set's x axis the bar index through `barCentresPx`.
 * Captures NOTHING: the caller's undo step owns it (Auto digitize sets it
 * after the drafts, in the run's one step).
 *
 * @returns false (and changes nothing) when there is no bar
 */
export function setBarIndexXAxis(
  ctx: DigitizerContext,
  barCentresPx: number[],
  frame: Rect | null = ctx.axisSetRepository.activeAxisSet.plotArea,
): boolean {
  const axisSet = ctx.axisSetRepository.activeAxisSet
  // INFO: one bar: x2 a quarter of the frame to its right (see barIndexAxis)
  const reference = barIndexReferences(
    barCentresPx,
    frame ? frame.widthPx / 4 : undefined,
  )
  if (!reference) return false
  // INFO: without a frame (and no x marker yet), at the value axis's low
  // reference — near the bars' base rather than the top of the image
  const yPx =
    frame || axisSet.x1.coordIsFilled || !axisSet.y1.coordIsFilled
      ? xAxisLineY(axisSet, frame)
      : axisSet.y1.coord.yPx
  axisSet.x1.coord = { xPx: reference.low.px, yPx }
  axisSet.x2.coord = { xPx: reference.high.px, yPx }
  axisSet.setX1Value(reference.low.value)
  axisSet.setX2Value(reference.high.value)
  axisSet.setXIsLogScale(false)
  axisSet.pointMode = POINT_MODE.FOUR_POINTS
  axisSet.inactivateAxis()
  return true
}

// INFO: Ticks are 1-D, so the x markers still need a y to be drawn at (and
// the y markers an x). The axis LINES are the natural place: the frame's
// bottom edge for x, its left (or right) edge for y. Without a frame, keep
// whatever the marker had, so a re-run does not make it jump.
function xAxisLineY(axisSet: AxisSetInterface, frame: Rect | null): number {
  if (frame) return frame.yPx + frame.heightPx
  return Math.max(axisSet.x1.coord.yPx, 0)
}

function yAxisLineX(
  axisSet: AxisSetInterface,
  frame: Rect | null,
  side: 'left' | 'right',
): number {
  if (frame) return side === 'right' ? frame.xPx + frame.widthPx : frame.xPx
  return Math.max(axisSet.y1.coord.xPx, 0)
}

function applyXAxis(
  axisSet: AxisSetInterface,
  proposal: AutoCalibrationProposal,
): void {
  const axis = proposal.x
  const fit = fitAxisTicks(axis.ticks, axis.scale ?? 'linear')
  const yPx = xAxisLineY(axisSet, proposal.frame)
  axisSet.x1.coord = { xPx: fit.reference.low.px, yPx }
  axisSet.x2.coord = { xPx: fit.reference.high.px, yPx }
  axisSet.setX1Value(fit.reference.low.value)
  axisSet.setX2Value(fit.reference.high.value)
  axisSet.setXIsLogScale(fit.scale === 'log')
}

function applyYAxis(
  axisSet: AxisSetInterface,
  proposal: AutoCalibrationProposal,
): void {
  const axis = proposal.y
  const fit = fitAxisTicks(axis.ticks, axis.scale ?? 'linear')
  const xPx = yAxisLineX(axisSet, proposal.frame, proposal.ySide)
  axisSet.y1.coord = { xPx, yPx: fit.reference.low.px }
  axisSet.y2.coord = { xPx, yPx: fit.reference.high.px }
  axisSet.setY1Value(fit.reference.low.value)
  axisSet.setY2Value(fit.reference.high.value)
  axisSet.setYIsLogScale(fit.scale === 'log')
}
