import { DigitizerContext } from '@/application/digitizerContext'
import { Point } from '@/@types/types'
import { calibratedSpaceOf } from '@/application/utils/calibratedSpace'
import { planResample, ResampleOptions } from '@/application/utils/resample'

// INFO: The Resample use case for the active dataset. Same layering as
// pointOperations.ts: the preview only reads, and the one capture() sits
// with the mutation, so Apply is ONE undo step whoever calls it.

/** The edit name this use case records (HistoryManager.capture). */
export const RESAMPLE_ACTION = 'points.resample'

export interface ResamplePreview {
  datasetId: number
  before: number
  after: number
  /** the new points in original-image pixels, in their new order */
  pixels: { xPx: number; yPx: number }[]
  /** the same points as data values (log axes already undone) */
  values: { x: number; y: number }[]
  /** the input as data values, for drawing the preview */
  inputValues: { x: number; y: number }[]
  logX: boolean
  logY: boolean
  notes: string[]
  /** set when Apply would refuse; nothing else is meaningful then */
  error?: string
}

/**
 * Compute what Resample would do to the active dataset. Reads only.
 */
export function previewResample(
  ctx: DigitizerContext,
  options: ResampleOptions,
): ResamplePreview {
  return computeResample(ctx, options).preview
}

function computeResample(
  ctx: DigitizerContext,
  options: ResampleOptions,
): { preview: ResamplePreview; sources: (number | undefined)[] } {
  const { axisSetRepository, datasetRepository } = ctx
  const dataset = datasetRepository.activeDataset
  const axisSet = axisSetRepository.axisSets.find(
    (candidate) => candidate.id === dataset.axisSetId,
  )
  const space = calibratedSpaceOf(axisSet)
  const base: ResamplePreview = {
    datasetId: dataset.id,
    before: dataset.points.length,
    after: 0,
    pixels: [],
    values: [],
    inputValues: [],
    logX: space?.logX ?? false,
    logY: space?.logY ?? false,
    notes: [],
  }
  if (!space) {
    const error =
      "Calibrate this dataset's axis set first (x1, x2, y1, y2 and their values)"
    return { preview: { ...base, error }, sources: [] }
  }
  const input = dataset.points.map((p) => space.toCalibrated(p.xPx, p.yPx))
  const inputValues = input.map((p) => ({
    x: space.uToValue(p.u),
    y: space.vToValue(p.v),
  }))
  const plan = planResample(
    input,
    options,
    { pxPerU: space.pxPerU, pxPerV: space.pxPerV },
    space,
  )
  if (plan.error) {
    return {
      preview: { ...base, inputValues, notes: plan.notes, error: plan.error },
      sources: [],
    }
  }
  const isSmoothed = (options.smoothWindow ?? 1) > 1
  const pixels = plan.points.map((p) => {
    // INFO: a point kept as it was goes back on its own pixel, not on a
    // round-tripped one, so "Keep every k-th" moves nothing at all.
    if (p.source !== undefined && !isSmoothed) {
      const original = dataset.points[p.source]
      return { xPx: original.xPx, yPx: original.yPx }
    }
    return space.toPixel(p.u, p.v)
  })
  return {
    preview: {
      ...base,
      after: plan.points.length,
      pixels,
      values: plan.points.map((p) => ({
        x: space.uToValue(p.u),
        y: space.vToValue(p.v),
      })),
      inputValues,
      notes: plan.notes,
    },
    sources: plan.points.map((p) => p.source),
  }
}

/**
 * Replace the active dataset's points with the resampled ones, as ONE undo
 * step (`points.resample`).
 *
 * A point that is one of the input points (thinning, every k-th, simplify,
 * smoothing) keeps its `origin` and `score`, so the auto-extraction edit log
 * sees it as kept or moved rather than deleted and re-added. Interpolated
 * points are new.
 *
 * @returns the preview that was applied, or null when it had an error —
 * nothing is captured or changed then.
 */
export function applyResample(
  ctx: DigitizerContext,
  options: ResampleOptions,
): ResamplePreview | null {
  const { preview, sources } = computeResample(ctx, options)
  if (preview.error) return null

  const { datasetRepository, historyManager, interpolator } = ctx
  const dataset = datasetRepository.activeDataset

  // INFO: taken BEFORE clearPreview(), which deletes the interpolation
  // anchors — `sources` index the points as the preview saw them.
  const old = dataset.points.slice()
  historyManager.capture(RESAMPLE_ACTION)
  // INFO: the anchors of an interpolation in progress are old points; the
  // preview goes with them (replacePoints clears tempPoints as well).
  if (interpolator.isActive) interpolator.clearPreview()
  const next: Omit<Point, 'id'>[] = preview.pixels.map((pixel, i) => {
    const source = sources[i]
    const point: Omit<Point, 'id'> = { xPx: pixel.xPx, yPx: pixel.yPx }
    if (source !== undefined) {
      const original = old[source]
      if (original.origin) point.origin = { ...original.origin }
      if (original.score !== undefined) point.score = original.score
    }
    return point
  })
  dataset.replacePoints(next)
  return preview
}
