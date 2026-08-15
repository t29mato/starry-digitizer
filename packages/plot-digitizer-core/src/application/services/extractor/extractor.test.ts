import { Extractor } from './extractor'
import type { ExtractStrategyInterface } from '../../strategies/extractStrategies/extractStrategyInterface'
import type { PixelSourcePort } from '../../ports/pixelSourcePort'
import type { Coord } from '../../../domain/types'

function createStubPixelSource(
  overrides: Partial<PixelSourcePort> = {},
): PixelSourcePort {
  return {
    width: 10,
    height: 5,
    isDrawnMask: false,
    getImageColors: () => new Uint8ClampedArray(10 * 5 * 4),
    getMaskColors: () => new Uint8ClampedArray(10 * 5 * 4),
    ...overrides,
  }
}

function createSpyStrategy(returnValue: Coord[] = []): {
  strategy: ExtractStrategyInterface
  calls: unknown[][]
} {
  const calls: unknown[][] = []
  const strategy: ExtractStrategyInterface = {
    name: 'Spy Strategy',
    execute: (...args) => {
      calls.push(args)
      return returnValue
    },
  }
  return { strategy, calls }
}

describe('Extractor', () => {
  test('constructor sets the initial strategy', () => {
    const { strategy } = createSpyStrategy()
    const extractor = new Extractor(strategy)
    expect(extractor.strategy).toBe(strategy)
  })

  test('setStrategy replaces the active strategy', () => {
    const { strategy: strategyA } = createSpyStrategy()
    const { strategy: strategyB } = createSpyStrategy()
    const extractor = new Extractor(strategyA)
    extractor.setStrategy(strategyB)
    expect(extractor.strategy).toBe(strategyB)
  })

  describe('execute', () => {
    test('forwards the pixel source data, target color, and threshold to the strategy', () => {
      const expectedCoords: Coord[] = [{ xPx: 1, yPx: 2 }]
      const { strategy, calls } = createSpyStrategy(expectedCoords)
      const extractor = new Extractor(strategy)
      extractor.setColorPicker('#ff8000')
      extractor.setColorDistancePct(15)

      const imageColors = new Uint8ClampedArray(10 * 5 * 4)
      const maskColors = new Uint8ClampedArray(10 * 5 * 4)
      const pixelSource = createStubPixelSource({
        isDrawnMask: true,
        getImageColors: () => imageColors,
        getMaskColors: () => maskColors,
      })

      const result = extractor.execute(pixelSource)

      expect(result).toBe(expectedCoords)
      expect(calls).toEqual([
        [5, 10, imageColors, maskColors, true, [255, 128, 0], 15],
      ])
    })
  })

  describe('targetColor / targetColorHex', () => {
    test('parses the colorPicker hex string into RGB components', () => {
      const { strategy } = createSpyStrategy()
      const extractor = new Extractor(strategy)
      extractor.setColorPicker('#ff8000ff')
      expect(extractor.targetColor).toEqual({ R: 255, G: 128, B: 0 })
    })

    test('targetColorHex re-derives a hex string from targetColor', () => {
      const { strategy } = createSpyStrategy()
      const extractor = new Extractor(strategy)
      extractor.setColorPicker('#ff8000ff')
      expect(extractor.targetColorHex).toBe('#ff800')
    })
  })

  describe('updateSwatches / setSwatches', () => {
    test('distributes colors round-robin across 5 swatch rows and picks the first as colorPicker', () => {
      const { strategy } = createSpyStrategy()
      const extractor = new Extractor(strategy)
      extractor.setSwatches(['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'])
      expect(extractor.swatches).toEqual([
        ['#111111', '#666666'],
        ['#222222'],
        ['#333333'],
        ['#444444'],
        ['#555555'],
      ])
      expect(extractor.colorPicker).toBe('#111111')
    })
  })
})
