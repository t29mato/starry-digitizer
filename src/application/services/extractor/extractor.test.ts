import { Extractor } from './extractor'
import SymbolExtractByArea from '../../strategies/extractStrategies/symbolExtractByArea'
import LineExtract from '../../strategies/extractStrategies/lineExtract'
import ExtractStrategyInterface from '../../strategies/extractStrategies/extractStrategyInterface'
import { Coord } from '@/@types/types'
import { Axis } from '@/domain/models/axis/axis'
import { AxisSet } from '@/domain/models/axisSet/axisSet'
import { AxisSetInterface } from '@/domain/models/axisSet/axisSetInterface'
import { CanvasHandlerInterface } from '@/application/services/canvasHandler/canvasHandlerInterface'

test('DO write extractor test', () => {
  const extractor = new Extractor(LineExtract.instance)
  extractor.setStrategy(new SymbolExtractByArea())
})

describe('Extractor.execute clip to axes', () => {
  // INFO: a stub strategy that returns a fixed set of points regardless of
  // the image/mask data, so tests can focus on the post-filtering behaviour.
  class StubStrategy implements ExtractStrategyInterface {
    name = 'Stub'
    points: Coord[]
    constructor(points: Coord[]) {
      this.points = points
    }
    execute(): Coord[] {
      return this.points
    }
  }

  const fakeCanvasHandler = {
    imageElement: { height: 1000, width: 1000 },
    originalImageCanvasColors: new Uint8ClampedArray(),
    originalSizeMaskCanvasColors: new Uint8ClampedArray(),
    isDrawnMask: false,
  } as unknown as CanvasHandlerInterface

  const buildAxisSet = (): AxisSetInterface =>
    new AxisSet(
      new Axis('x1', 1, { xPx: 100, yPx: 0 }),
      new Axis('x2', 10, { xPx: 900, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 800 }),
      new Axis('y2', 10, { xPx: 0, yPx: 200 }),
      new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
      1,
      'XY Axes 1',
    )

  const points: Coord[] = [
    { xPx: 500, yPx: 500 }, // inside the box
    { xPx: 100, yPx: 200 }, // on the corner (inclusive boundary)
    { xPx: 50, yPx: 500 }, // outside: left of x1
    { xPx: 950, yPx: 500 }, // outside: right of x2
    { xPx: 500, yPx: 100 }, // outside: above y2
    { xPx: 500, yPx: 850 }, // outside: below y1
  ]

  it('filters out points outside the calibrated axes rectangle by default', () => {
    const extractor = new Extractor(new StubStrategy(points))
    const axisSet = buildAxisSet()

    const result = extractor.execute(fakeCanvasHandler, axisSet)

    expect(result).toEqual([
      { xPx: 500, yPx: 500 },
      { xPx: 100, yPx: 200 },
    ])
  })

  it('does not filter when clipToAxes is disabled', () => {
    const extractor = new Extractor(new StubStrategy(points))
    extractor.setClipToAxes(false)
    const axisSet = buildAxisSet()

    const result = extractor.execute(fakeCanvasHandler, axisSet)

    expect(result).toEqual(points)
  })

  it('does not filter when no axisSet is provided', () => {
    const extractor = new Extractor(new StubStrategy(points))

    const result = extractor.execute(fakeCanvasHandler)

    expect(result).toEqual(points)
  })

  it('does not filter when the axis set is not fully calibrated', () => {
    const extractor = new Extractor(new StubStrategy(points))
    // x2/y2 are left unplaced
    const axisSet = new AxisSet(
      new Axis('x1', 1, { xPx: 100, yPx: 0 }),
      new Axis('x2', 10),
      new Axis('y1', 1, { xPx: 0, yPx: 800 }),
      new Axis('y2', 10),
      new Axis('x1y1', -1),
      1,
      'XY Axes 1',
    )

    const result = extractor.execute(fakeCanvasHandler, axisSet)

    expect(result).toEqual(points)
  })

  it('handles axes defined in either direction (x1 to the right of x2, etc.)', () => {
    const extractor = new Extractor(new StubStrategy(points))
    // Same rectangle as buildAxisSet(), but x1/x2 and y1/y2 swapped
    const axisSet = new AxisSet(
      new Axis('x1', 1, { xPx: 900, yPx: 0 }),
      new Axis('x2', 10, { xPx: 100, yPx: 0 }),
      new Axis('y1', 1, { xPx: 0, yPx: 200 }),
      new Axis('y2', 10, { xPx: 0, yPx: 800 }),
      new Axis('x1y1', -1, { xPx: 0, yPx: 0 }),
      1,
      'XY Axes 1',
    )

    const result = extractor.execute(fakeCanvasHandler, axisSet)

    expect(result).toEqual([
      { xPx: 500, yPx: 500 },
      { xPx: 100, yPx: 200 },
    ])
  })
})
