import { expect } from '@jest/globals'
import XYAxisSetCalculator from './XYAxisSetCalculator'
import { AxisRepositoryInterface } from '../repositories/axisRepository/axisRepositoryInterface'
import { Axis } from '../models/axis/axis'
import { AxisRepository } from '../repositories/axisRepository/axisRepository'

describe('XYAxisSetCalculator', () => {
  let axesMock: AxisRepositoryInterface
  beforeEach(() => {
    // Initialize mock AxisRepositoryInterface with minimal data
    axesMock = new AxisRepository(
      new Axis('x1', 1, { xPx: 0, yPx: 0 }),
      new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
      new Axis('y2', 10, { xPx: 0, yPx: 0 }),
      new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
    )
  })

  it('should calculate XY values correctly', () => {
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values as NaN when no coordinates provided', () => {
    // @ts-ignore
    axesMock.x1.coord = null
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values as NaN when x1 value equals x2 value', () => {
    axesMock.x2.value = axesMock.x1.value
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  // Add more test cases as required
  it('should calculate XY values as NaN when y1 value equals y2 value', () => {
    axesMock.y2.value = axesMock.y1.value
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values correctly with logarithmic scale on x-axis', () => {
    const calculator = new XYAxisSetCalculator(axesMock, { x: true, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on y-axis', () => {
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on both axes', () => {
    const calculator = new XYAxisSetCalculator(axesMock, { x: true, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values with higher precision when effective digits are increased', () => {
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    calculator.effectiveDigits = 6
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  // INFO: fix the following issue https://github.com/t29mato/starry-digitizer/issues/17
  it('should calculate XY values correctly without graph tilt from Saito-san case', () => {
    const plot = { id: 1, xPx: 436.3524590163934, yPx: 192.08879781420765 }
    axesMock = {
      // @ts-ignore
      x1: {
        name: 'x1',
        value: 100,
        coord: { xPx: 244.72677595628414, yPx: 353.23770491803276 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      x2: {
        name: 'x2',
        value: 300,
        coord: { xPx: 629.1325136612022, yPx: 355.5464480874317 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      y1: {
        name: 'y1',
        value: 20,
        coord: { xPx: 245.88114754098362, yPx: 197.39754098360655 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      y2: {
        name: 'y2',
        value: 30,
        coord: { xPx: 243.5724043715847, yPx: 45.02049180327869 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      xIsLog: false,
      yIsLog: false,
      activeAxisName: '',
      x1IsSameAsY1: false,
      considerGraphTilt: false,
      isAdjusting: false,
    }
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(plot.xPx, plot.yPx)
    expect(result).toStrictEqual({ xV: '1.997e+2', yV: '2.035e+1' })
  })

  // INFO: fix the following issue https://github.com/t29mato/starry-digitizer/issues/17
  it('should calculate XY values correctly with graph tilt from Saito-san case', () => {
    const plot = { id: 1, xPx: 436.3524590163934, yPx: 192.08879781420765 }
    axesMock = {
      // @ts-ignore
      x1: {
        name: 'x1',
        value: 100,
        coord: { xPx: 244.72677595628414, yPx: 353.23770491803276 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      x2: {
        name: 'x2',
        value: 300,
        coord: { xPx: 629.1325136612022, yPx: 355.5464480874317 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      y1: {
        name: 'y1',
        value: 20,
        coord: { xPx: 245.88114754098362, yPx: 197.39754098360655 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      // @ts-ignore
      y2: {
        name: 'y2',
        value: 30,
        coord: { xPx: 243.5724043715847, yPx: 45.02049180327869 },
        initialCoord: { xPx: -999, yPx: -999 },
      },
      xIsLog: false,
      yIsLog: false,
      activeAxisName: '',
      x1IsSameAsY1: false,
      considerGraphTilt: true, // This is the difference of this test case
      isAdjusting: false,
    }
    const calculator = new XYAxisSetCalculator(axesMock, { x: false, y: false })
    const result = calculator.calculateXYValues(plot.xPx, plot.yPx)
    expect(result).toStrictEqual({ xV: '2.01e+2', yV: '2.042e+1' })
  })
})
