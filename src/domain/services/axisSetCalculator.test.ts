import { expect } from '@jest/globals'
import AxisSetCalculator from './axisSetCalculator'
import { Axis } from '../models/axis/axis'
import { AxisSet } from '../models/axisSet/axisSet'
import { AxisSetInterface } from '../models/axisSet/axisSetInterface'

describe('AxisSetCalculator', () => {
  let axisSetMock: AxisSetInterface
  beforeEach(() => {
    // Initialize mock AxisSetRepositoryInterface with minimal data
    axisSetMock = new AxisSet(
      new Axis('x1', 1, { xPx: 0, yPx: 0 }),
      new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
      new Axis('y2', 10, { xPx: 0, yPx: 0 }),
      new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
      1,
      'XY Axes 1',
    )
  })

  it('should calculate XY values correctly', () => {
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values as NaN when no coordinates provided', () => {
    // @ts-ignore
    axisSetMock.x1.coord = null
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values as NaN when x1 value equals x2 value', () => {
    axisSetMock.x2.value = axisSetMock.x1.value
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  // Add more test cases as required
  it('should calculate XY values as NaN when y1 value equals y2 value', () => {
    axisSetMock.y2.value = axisSetMock.y1.value
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('NaN')
    expect(result.yV).toBe('NaN')
  })

  it('should calculate XY values correctly with logarithmic scale on x-axis', () => {
    const calculator = new AxisSetCalculator(axisSetMock, { x: true, y: false })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on y-axis', () => {
    const calculator = new AxisSetCalculator(axisSetMock, { x: false, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values correctly with logarithmic scale on both axisSet', () => {
    const calculator = new AxisSetCalculator(axisSetMock, { x: true, y: true })
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('3.1623e+0')
    expect(result.yV).toBe('3.1623e+0')
  })

  it('should calculate XY values with higher precision when effective digits are increased', () => {
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    calculator.effectiveDigits = 6
    const result = calculator.calculateXYValues(500, 500)
    expect(result.xV).toBe('5.5e+0')
    expect(result.yV).toBe('5.5e+0')
  })

  // INFO: fix the following issue https://github.com/t29mato/starry-digitizer/issues/17
  it('should calculate XY values correctly without graph tilt from Saito-san case', () => {
    const plot = { id: 1, xPx: 436.3524590163934, yPx: 192.08879781420765 }
    axisSetMock = {
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
      xIsLogScale: false,
      yIsLogScale: false,
      activeAxisName: '',
      x1IsSameAsY1: false,
      considerGraphTilt: false,
      isAdjusting: false,
    }
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(plot.xPx, plot.yPx)
    expect(result).toStrictEqual({ xV: '1.997e+2', yV: '2.035e+1' })
  })

  // INFO: fix the following issue https://github.com/t29mato/starry-digitizer/issues/17
  it('should calculate XY values correctly with graph tilt from Saito-san case', () => {
    const plot = { id: 1, xPx: 436.3524590163934, yPx: 192.08879781420765 }
    axisSetMock = {
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
      xIsLogScale: false,
      yIsLogScale: false,
      activeAxisName: '',
      x1IsSameAsY1: false,
      considerGraphTilt: true, // This is the difference of this test case
      isAdjusting: false,
    }
    const calculator = new AxisSetCalculator(axisSetMock, {
      x: false,
      y: false,
    })
    const result = calculator.calculateXYValues(plot.xPx, plot.yPx)
    expect(result).toStrictEqual({ xV: '2.01e+2', yV: '2.042e+1' })
  })

  describe('calculatePixelCoordinates', () => {
    beforeEach(() => {
      // Reset to basic mock for reverse transformation tests
      axisSetMock = new AxisSet(
        new Axis('x1', 1, { xPx: 0, yPx: 0 }),
        new Axis('x2', 10, { xPx: 1000, yPx: 0 }),
        new Axis('y1', 1, { xPx: 0, yPx: 1000 }),
        new Axis('y2', 10, { xPx: 0, yPx: 0 }),
        new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
        1,
        'XY Axes 1',
      )
    })

    it('should calculate pixel coordinates correctly for basic linear transformation', () => {
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      const result = calculator.calculatePixelCoordinates(5.5, 5.5)
      expect(result).toEqual({ xPx: 500, yPx: 500 })
    })

    it('should calculate pixel coordinates correctly for X axis boundary values', () => {
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      
      const minResult = calculator.calculatePixelCoordinates(1, 5.5)
      expect(minResult).toEqual({ xPx: 0, yPx: 500 })
      
      const maxResult = calculator.calculatePixelCoordinates(10, 5.5)
      expect(maxResult).toEqual({ xPx: 1000, yPx: 500 })
    })

    it('should calculate pixel coordinates correctly for Y axis boundary values', () => {
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      
      const minResult = calculator.calculatePixelCoordinates(5.5, 1)
      expect(minResult).toEqual({ xPx: 500, yPx: 1000 })
      
      const maxResult = calculator.calculatePixelCoordinates(5.5, 10)
      expect(maxResult).toEqual({ xPx: 500, yPx: 0 })
    })

    it('should return null when no coordinates are provided', () => {
      // @ts-ignore
      axisSetMock.x1.coord = null
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      const result = calculator.calculatePixelCoordinates(5.5, 5.5)
      expect(result).toBeNull()
    })

    it('should return null when x1 value equals x2 value', () => {
      axisSetMock.x2.value = axisSetMock.x1.value
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      const result = calculator.calculatePixelCoordinates(5.5, 5.5)
      expect(result).toBeNull()
    })

    it('should return null when y1 value equals y2 value', () => {
      axisSetMock.y2.value = axisSetMock.y1.value
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      const result = calculator.calculatePixelCoordinates(5.5, 5.5)
      expect(result).toBeNull()
    })

    it('should calculate pixel coordinates correctly with logarithmic scale on X axis', () => {
      const calculator = new AxisSetCalculator(axisSetMock, { x: true, y: false })
      // For log scale: x=√10 ≈ 3.162 should map to middle (500px)
      const result = calculator.calculatePixelCoordinates(3.1622776601683795, 5.5)
      expect(result?.xPx).toBeCloseTo(500, 0)
      expect(result?.yPx).toBe(500)
    })

    it('should calculate pixel coordinates correctly with logarithmic scale on Y axis', () => {
      const calculator = new AxisSetCalculator(axisSetMock, { x: false, y: true })
      // For log scale: y=√10 ≈ 3.162 should map to middle (500px)
      const result = calculator.calculatePixelCoordinates(5.5, 3.1622776601683795)
      expect(result?.xPx).toBe(500)
      expect(result?.yPx).toBeCloseTo(500, 0)
    })

    it('should calculate pixel coordinates correctly with logarithmic scale on both axes', () => {
      const calculator = new AxisSetCalculator(axisSetMock, { x: true, y: true })
      const result = calculator.calculatePixelCoordinates(3.1622776601683795, 3.1622776601683795)
      expect(result?.xPx).toBeCloseTo(500, 0)
      expect(result?.yPx).toBeCloseTo(500, 0)
    })

    it('should handle values outside axis range gracefully', () => {
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      
      // Test values outside the defined range (1-10)
      const belowRangeResult = calculator.calculatePixelCoordinates(0, 5.5)
      expect(belowRangeResult?.xPx).toBeCloseTo(-111.11, 1)
      expect(belowRangeResult?.yPx).toBe(500)
      
      const aboveRangeResult = calculator.calculatePixelCoordinates(15, 5.5)
      expect(aboveRangeResult?.xPx).toBeCloseTo(1555.56, 1)
      expect(aboveRangeResult?.yPx).toBe(500)
    })

    it('should perform accurate round-trip transformation (forward → reverse → forward)', () => {
      const calculator = new AxisSetCalculator(axisSetMock, {
        x: false,
        y: false,
      })
      
      // Start with pixel coordinates
      const originalPixel = { xPx: 750, yPx: 250 }
      
      // Forward transformation: pixel → real values
      const realValues = calculator.calculateXYValues(originalPixel.xPx, originalPixel.yPx)
      const xReal = parseFloat(realValues.xV.replace('e+0', ''))
      const yReal = parseFloat(realValues.yV.replace('e+0', ''))
      
      // Reverse transformation: real values → pixel
      const backToPixel = calculator.calculatePixelCoordinates(xReal, yReal)
      
      // Should match original pixel coordinates (within reasonable precision)
      expect(backToPixel?.xPx).toBeCloseTo(originalPixel.xPx, 0)
      expect(backToPixel?.yPx).toBeCloseTo(originalPixel.yPx, 0)
    })

    it('should calculate pixel coordinates correctly with graph tilt enabled', () => {
      // Create a simple tilted graph configuration
      const tiltedAxisSet = new AxisSet(
        new Axis('x1', 0, { xPx: 100, yPx: 100 }),
        new Axis('x2', 10, { xPx: 500, yPx: 150 }), // Slight tilt on X axis
        new Axis('y1', 0, { xPx: 100, yPx: 100 }),
        new Axis('y2', 10, { xPx: 150, yPx: 500 }), // Slight tilt on Y axis
        new Axis('x1y1', -1, { xPx: 100, yPx: 100 }),
        1,
        'Tilted Axes',
      )
      tiltedAxisSet.considerGraphTilt = true
      
      const calculator = new AxisSetCalculator(tiltedAxisSet, {
        x: false,
        y: false,
      })
      
      // Test that reverse transformation produces reasonable results
      const result = calculator.calculatePixelCoordinates(5, 5)
      
      // With graph tilt, coordinates should be different from simple linear case
      // but still within reasonable bounds
      expect(result).not.toBeNull()
      expect(result?.xPx).toBeGreaterThan(100)
      expect(result?.xPx).toBeLessThan(500)
      expect(result?.yPx).toBeGreaterThan(100)
      expect(result?.yPx).toBeLessThan(500)
    })

    it('should perform round-trip transformation with simple graph tilt', () => {
      // Use a simpler axis configuration for round-trip test
      const tiltedAxisSet = new AxisSet(
        new Axis('x1', 1, { xPx: 0, yPx: 10 }),
        new Axis('x2', 10, { xPx: 1000, yPx: 20 }), // Very slight tilt
        new Axis('y1', 1, { xPx: 10, yPx: 1000 }),
        new Axis('y2', 10, { xPx: 20, yPx: 0 }), // Very slight tilt
        new Axis('x1y1', -1, { xPx: 0, yPx: 1000 }),
        1,
        'Slightly Tilted Axes',
      )
      tiltedAxisSet.considerGraphTilt = true
      
      const calculator = new AxisSetCalculator(tiltedAxisSet, {
        x: false,
        y: false,
      })
      
      // Test round-trip transformation
      const originalPixel = { xPx: 500, yPx: 500 }
      
      // Forward: pixel → real values
      const realValues = calculator.calculateXYValues(originalPixel.xPx, originalPixel.yPx)
      const xReal = parseFloat(realValues.xV.replace('e+0', ''))
      const yReal = parseFloat(realValues.yV.replace('e+0', ''))
      
      // Reverse: real values → pixel
      const backToPixel = calculator.calculatePixelCoordinates(xReal, yReal)
      
      // Should match original pixel coordinates within reasonable tolerance
      // Graph tilt introduces some computation complexity so allow slightly larger tolerance
      expect(Math.abs(backToPixel!.xPx - originalPixel.xPx)).toBeLessThan(15)
      expect(Math.abs(backToPixel!.yPx - originalPixel.yPx)).toBeLessThan(15)
    })

    it('should handle round-trip transformation accurately with logarithmic scales', () => {
      const calculator = new AxisSetCalculator(axisSetMock, { x: true, y: true })
      
      const originalPixel = { xPx: 600, yPx: 300 }
      
      // Forward: pixel → real values (with log scale)
      const realValues = calculator.calculateXYValues(originalPixel.xPx, originalPixel.yPx)
      const xReal = parseFloat(realValues.xV.replace('e+0', ''))
      const yReal = parseFloat(realValues.yV.replace('e+0', ''))
      
      // Reverse: real values → pixel (with log scale)
      const backToPixel = calculator.calculatePixelCoordinates(xReal, yReal)
      
      expect(backToPixel?.xPx).toBeCloseTo(originalPixel.xPx, 0)
      expect(backToPixel?.yPx).toBeCloseTo(originalPixel.yPx, 0)
    })
  })
})
