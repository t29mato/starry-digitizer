import { DigitizerContext } from '@/application/digitizerContext'
import { Coord } from '@/@types/types'
import { PixelSource } from '@/application/ports/pixelSource'
import { RGB, traceCurve } from '@/application/utils/curveTrace'
import { CurveTraceOutcome } from '@/application/services/curveTrace/curveTraceSettings'

// INFO: The Trace Curve use case. Same layering as pointOperations.ts: the
// trace only reads pixels and runs BEFORE capture(), so a click that finds
// nothing leaves no empty undo step, and the points it adds are ONE undo
// step whoever calls it.

/** The edit name this use case records (HistoryManager.capture). */
export const TRACE_ACTION = 'points.trace'

const toHex = (color: RGB): string =>
  '#' + color.map((c) => c.toString(16).padStart(2, '0')).join('')

/**
 * Trace the curve under `coord` (ORIGINAL image pixels) and add its points to
 * the active dataset.
 *
 * Uses the extractor's colour distance and the drawn mask, like Automatic
 * Extraction, and the tool's own settings (`ctx.curveTrace`). The outcome is
 * also kept in `ctx.curveTrace.lastOutcome` for the status line.
 *
 * What is NOT here, because the caller owns it: whether tracing is allowed at
 * all (readonly, view-all mode), as with addPoint().
 *
 * @param source the pixels; the canvas handler by default.
 */
export function traceCurveAt(
  ctx: DigitizerContext,
  coord: Coord,
  source: PixelSource = ctx.canvasHandler,
): CurveTraceOutcome {
  const { axisSetRepository, curveTrace, datasetRepository, extractor } = ctx
  const finish = (outcome: CurveTraceOutcome) => {
    curveTrace.setLastOutcome(outcome)
    return outcome
  }
  if (source.width <= 0 || source.height <= 0) {
    return finish({
      added: 0,
      stops: null,
      colorHex: null,
      lengthPx: 0,
      error: 'No image',
    })
  }
  const target = extractor.targetColor
  const result = traceCurve(
    {
      width: source.width,
      height: source.height,
      pixels: source.getImagePixels(),
      mask: source.hasMask ? source.getMaskPixels() : null,
      hasMask: source.hasMask,
    },
    coord,
    {
      colorDistancePct: extractor.colorDistancePct,
      maxGapPx: curveTrace.maxGapPx,
      spacingPx: curveTrace.spacingPx,
      sampling: curveTrace.sampling,
      color:
        curveTrace.colorSource === 'picker'
          ? [target.R, target.G, target.B]
          : undefined,
    },
  )
  const colorHex = result.color ? toHex(result.color) : null
  if (result.error || result.points.length === 0) {
    return finish({
      added: 0,
      stops: null,
      colorHex,
      lengthPx: 0,
      error: result.error ?? 'Nothing to trace here',
    })
  }

  ctx.historyManager.capture(TRACE_ACTION)
  axisSetRepository.activeAxisSet.inactivateAxis()
  const dataset = datasetRepository.activeDataset
  result.points.forEach((point) => dataset.addPoint(point.xPx, point.yPx))
  // INFO: addPoint() selects each new point; leave the whole trace selected
  // so the user can delete or nudge it as one.
  dataset.inactivatePoints()
  const added = result.points.length
  for (let i = dataset.points.length - added; i < dataset.points.length; i++) {
    dataset.addActivatedPoint(dataset.points[i].id)
  }
  return finish({
    added,
    stops: result.stops,
    colorHex,
    lengthPx: result.lengthPx,
  })
}
