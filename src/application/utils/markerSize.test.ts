// INFO: reported from real use: at 16% zoom the data points buried the figure
// — the curve and the axis labels underneath could not be read. Marker
// coordinates are multiplied by `canvasHandler.scale` but the marker SIZE was
// a flat constant, so the lower the zoom the bigger a marker was relative to
// the figure. 10px at 16% covers 62.5px of the original image.
import { scaledMarkerSizePx } from '@/application/utils/markerSize'
import { STYLE } from '@/constants'

const { POINT_SIZE_PX, POINT_MIN_SIZE_PX, POINT_MAX_SIZE_PX } = STYLE

const pointSizeAt = (scale: number) =>
  scaledMarkerSizePx(
    POINT_SIZE_PX,
    scale,
    POINT_MIN_SIZE_PX,
    POINT_MAX_SIZE_PX,
  )

describe('scaledMarkerSizePx', () => {
  it('is the base size at 100%', () => {
    expect(pointSizeAt(1)).toBe(POINT_SIZE_PX)
  })

  it('shrinks with the zoom', () => {
    expect(pointSizeAt(0.5)).toBe(5)
  })

  // INFO: the reason a plain `size * scale` is not enough. 16% of 10px is
  // 1.6px — too small to see and too small to click, which would have traded
  // one unusable view for another.
  it('does not shrink below the floor', () => {
    expect(pointSizeAt(0.16)).toBe(POINT_MIN_SIZE_PX)
    expect(pointSizeAt(0.01)).toBe(POINT_MIN_SIZE_PX)
  })

  it('does not grow past the ceiling', () => {
    expect(pointSizeAt(4)).toBe(POINT_MAX_SIZE_PX)
    expect(pointSizeAt(100)).toBe(POINT_MAX_SIZE_PX)
  })

  it('never grows as the zoom falls', () => {
    const scales = [4, 2, 1, 0.5, 0.25, 0.16, 0.1]
    const sizes = scales.map(pointSizeAt)

    sizes.slice(1).forEach((size, i) => {
      expect(size).toBeLessThanOrEqual(sizes[i])
    })
  })

  // INFO: `scale` is a public field, so a host can put anything in it. A
  // marker that collapses to 0 (or NaN) is invisible with no way to tell why.
  it('falls back to the base size for a scale that cannot be used', () => {
    expect(pointSizeAt(0)).toBe(POINT_SIZE_PX)
    expect(pointSizeAt(-1)).toBe(POINT_SIZE_PX)
    expect(pointSizeAt(NaN)).toBe(POINT_SIZE_PX)
    expect(pointSizeAt(Infinity)).toBe(POINT_SIZE_PX)
  })

  it('covers the same fraction of the figure at every zoom, between the bounds', () => {
    // INFO: the property the fix is actually about — a marker keeps its size
    // RELATIVE TO THE IMAGE, which is what stops it swamping the figure.
    const imagePixelsCovered = (scale: number) => pointSizeAt(scale) / scale

    expect(imagePixelsCovered(1)).toBeCloseTo(imagePixelsCovered(0.5))
    expect(imagePixelsCovered(1)).toBeCloseTo(imagePixelsCovered(0.75))
  })
})
