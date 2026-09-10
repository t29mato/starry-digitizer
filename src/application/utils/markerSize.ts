/**
 * How big an overlay marker should be drawn at the current zoom.
 *
 * Marker COORDINATES are image pixels multiplied by `canvasHandler.scale`, so
 * a marker drawn at a fixed pixel size grows relative to the figure as the
 * user zooms out. Multiplying the size by the same `scale` keeps a marker the
 * same size relative to the figure — clamped, because a marker also has to
 * stay visible and hittable at the extremes, which pure proportion does not
 * (16% of 10px is 1.6px).
 *
 * Exported from `starry-digitizer/core` so a host that draws its own overlay
 * (rather than using CanvasPoints / CanvasAxis) gets the same behaviour
 * without rediscovering it, with the bounds in `STYLE`.
 *
 * @param basePx size at 100% zoom
 * @param scale `canvasHandler.scale`
 * @param minPx never smaller than this, whatever the zoom
 * @param maxPx never larger than this
 */
export function scaledMarkerSizePx(
  basePx: number,
  scale: number,
  minPx: number,
  maxPx: number,
): number {
  // INFO: a scale of 0 or NaN is not reachable through the zoom API, but
  // `scale` is a public field a host can assign; falling back to the base size
  // keeps a marker visible instead of collapsing it to nothing.
  if (!Number.isFinite(scale) || scale <= 0) {
    return basePx
  }
  return Math.min(Math.max(basePx * scale, minPx), maxPx)
}
