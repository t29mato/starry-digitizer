import { expect } from '@jest/globals'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import {
  convertDataUnitIntervalToPx,
  isXAxisCalibratedForDataUnitInterval,
} from './intervalUnitConverter'

const buildAxisSet = (overrides?: {
  x1?: { value: number; coord: { xPx: number; yPx: number } }
  x2?: { value: number; coord: { xPx: number; yPx: number } }
  xIsLogScale?: boolean
}): AxisSetInterface => {
  const x1 = new Axis(
    'x1',
    overrides?.x1?.value ?? 0,
    overrides?.x1?.coord ?? { xPx: 100, yPx: 500 },
  )
  const x2 = new Axis(
    'x2',
    overrides?.x2?.value ?? 1000,
    overrides?.x2?.coord ?? { xPx: 600, yPx: 500 },
  )
  const y1 = new Axis('y1', 0, { xPx: 100, yPx: 500 })
  const y2 = new Axis('y2', 1, { xPx: 100, yPx: 0 })
  const x2y2 = new Axis('x2y2', -1)
  const axisSet = new AxisSet(x1, x2, y1, y2, x2y2, 1, 'XY Axes 1')
  if (overrides?.xIsLogScale !== undefined) {
    axisSet.xIsLogScale = overrides.xIsLogScale
  }
  return axisSet
}

describe('isXAxisCalibratedForDataUnitInterval', () => {
  it('returns true for a properly calibrated linear x-axis', () => {
    const axisSet = buildAxisSet()
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(true)
  })

  it('returns false when the x-axis is log-scaled', () => {
    const axisSet = buildAxisSet({ xIsLogScale: true })
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(false)
  })

  it('returns false when x1 is not placed', () => {
    const axisSet = buildAxisSet()
    axisSet.x1.clearCoord()
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(false)
  })

  it('returns false when x2 is not placed', () => {
    const axisSet = buildAxisSet()
    axisSet.x2.clearCoord()
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(false)
  })

  it('returns false when x1 and x2 values are equal', () => {
    const axisSet = buildAxisSet({
      x1: { value: 5, coord: { xPx: 100, yPx: 500 } },
      x2: { value: 5, coord: { xPx: 600, yPx: 500 } },
    })
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(false)
  })

  it('returns false when x1 and x2 share the same pixel x-coordinate', () => {
    const axisSet = buildAxisSet({
      x1: { value: 0, coord: { xPx: 300, yPx: 100 } },
      x2: { value: 1000, coord: { xPx: 300, yPx: 500 } },
    })
    expect(isXAxisCalibratedForDataUnitInterval(axisSet)).toBe(false)
  })
})

describe('convertDataUnitIntervalToPx', () => {
  it('converts a data-unit interval to px using the calibrated scale', () => {
    // x1=0 at xPx=100, x2=1000 at xPx=600 -> 500px / 1000 units = 0.5 px/unit
    const axisSet = buildAxisSet()
    expect(convertDataUnitIntervalToPx(axisSet, 10)).toBe(5)
    expect(convertDataUnitIntervalToPx(axisSet, 10000)).toBe(5000)
  })

  it('handles a reversed x-axis (x2 pixel coordinate less than x1)', () => {
    const axisSet = buildAxisSet({
      x1: { value: 0, coord: { xPx: 600, yPx: 500 } },
      x2: { value: 1000, coord: { xPx: 100, yPx: 500 } },
    })
    expect(convertDataUnitIntervalToPx(axisSet, 10)).toBe(5)
  })

  it('handles a reversed value axis (x2 value less than x1 value)', () => {
    const axisSet = buildAxisSet({
      x1: { value: 1000, coord: { xPx: 100, yPx: 500 } },
      x2: { value: 0, coord: { xPx: 600, yPx: 500 } },
    })
    expect(convertDataUnitIntervalToPx(axisSet, 10)).toBe(5)
  })

  it('returns null when the axis is not calibrated', () => {
    const axisSet = buildAxisSet()
    axisSet.x1.clearCoord()
    expect(convertDataUnitIntervalToPx(axisSet, 10)).toBeNull()
  })

  it('returns null when the x-axis is log-scaled', () => {
    const axisSet = buildAxisSet({ xIsLogScale: true })
    expect(convertDataUnitIntervalToPx(axisSet, 10)).toBeNull()
  })
})
