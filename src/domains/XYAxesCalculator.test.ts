import XYAxesCalculator from './XYAxesCalculator'
import { AxesInterface } from './axes/axesInterface'
import { Axis } from './axes/axis'
import { Axes } from './axes/axes'

describe('XYAxesCalculator', () => {
  let axesMock: AxesInterface
  beforeEach(() => {
    // Initialize mock AxesInterface with minimal data
    axesMock = new Axes(
      new Axis('x1', 1, { xPx: 0, yPx: 0 }),
      new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
      new Axis('y2', 10, { xPx: 0, yPx: 0 })
    )
  })

  it('should calculate XY values correctly', () => {
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values as NaN when no coordinates provided', () => {
    // @ts-ignore
    axesMock.x1.coord = null
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values as NaN when x1 value equals x2 value', () => {
    axesMock.x2.value = axesMock.x1.value
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  // Add more test cases as required
  it('should calculate XY values as NaN when y1 value equals y2 value', () => {
    axesMock.y2.value = axesMock.y1.value
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values correctly with logarithmic scale on x-axis', () => {
    const calculator = new XYAxesCalculator(axesMock, { x: true, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on y-axis', () => {
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on both axes', () => {
    const calculator = new XYAxesCalculator(axesMock, { x: true, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values with higher precision when effective digits are increased', () => {
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    calculator.effectiveDigits = 6
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values correctly with graph tilt', () => {
    axesMock.considerGraphTilt = true
    axesMock.x1.coord = { xPx: 0, yPx: 500 }
    axesMock.x2.coord = { xPx: 1000, yPx: 600 }
    axesMock.y1.coord = { xPx: 500, yPx: 1000 }
    axesMock.y2.coord = { xPx: 600, yPx: 0 }
    const calculator = new XYAxesCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(550, 550)
    expect(result.xV).toBe('5.9455e+0')
    expect(result.yV).toBe('1.0446e+0')
  })
})
