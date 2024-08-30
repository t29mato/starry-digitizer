import { expect } from '@jest/globals'
import { AxisSet } from './AxisSet'
import { Axis } from '../axis/axis'
import { AxisInterface } from '../axis/axisInterface'

let x1: AxisInterface
let x2: AxisInterface
let y1: AxisInterface
let y2: AxisInterface
let x2y2: AxisInterface
let axisSet: AxisSet
beforeEach(() => {
  x1 = new Axis('x1', 0)
  x2 = new Axis('x2', 1)
  y1 = new Axis('y1', 0)
  y2 = new Axis('y2', 1)
  x2y2 = new Axis('x2y2', -1)
  axisSet = new AxisSet(x1, x2, y1, y2, x2y2, 1, 'XY Axes 1')
})

describe('4 points setting mode', () => {
  beforeEach(() => {
    axisSet.pointMode = 1
  })
  test('it has at least one axis', () => {
    expect(axisSet.hasAtLeastOneAxis).toBe(false)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
    expect(axisSet.hasAtLeastOneAxis).toBe(true)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
    expect(axisSet.hasAtLeastOneAxis).toBe(true)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
    expect(axisSet.hasAtLeastOneAxis).toBe(true)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
    expect(axisSet.hasAtLeastOneAxis).toBe(true)
    axisSet.clearAxisCoords()
    expect(axisSet.hasAtLeastOneAxis).toBe(false)
  })

  test('x1 and y1 coordinates are not same', () => {
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1
    expect(axisSet.x1.coord).toEqual({
      xPx: 100,
      yPx: 100,
    })
    expect(axisSet.y1.coord).toEqual(axisSet.y1.initialCoord)
  })

  test('active axis', () => {
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.x1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.x2)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.y1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.y2)
  })

  test('active axis when x1 and y1 coordinates are not same', () => {
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.x1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.x2)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.y1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.y2)
  })

  test('inactivate axis', () => {
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.activeAxis).toEqual(axisSet.x1)
    axisSet.inactivateAxis()
    expect(axisSet.activeAxis).toBeNull()
  })

  test('next axis', () => {
    expect(axisSet.nextAxis).toEqual(axisSet.x1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.nextAxis).toEqual(axisSet.x2)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.nextAxis).toEqual(axisSet.y1)
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 })
    expect(axisSet.nextAxis).toEqual(axisSet.y2)
  })

  test('move active axis', () => {
    expect(() =>
      axisSet.moveActiveAxis({ direction: 'up', distancePx: 1 }),
    ).toThrow("active axis's coord is undefined")
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    axisSet.moveActiveAxis({ direction: 'up', distancePx: 1 })
    expect(axisSet.x1.coord && axisSet.x1.coord.yPx).toBe(99)
    axisSet.moveActiveAxis({ direction: 'down', distancePx: 1 })
    expect(axisSet.x1.coord && axisSet.x1.coord.yPx).toBe(100)
    axisSet.moveActiveAxis({ direction: 'left', distancePx: 1 })
    expect(axisSet.x1.coord && axisSet.x1.coord.xPx).toBe(9)
    axisSet.moveActiveAxis({ direction: 'right', distancePx: 1 })
    expect(axisSet.x1.coord && axisSet.x1.coord.xPx).toBe(10)
  })

  test('add axis coodinate when all axisSet are filled', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    expect(() => axisSet.addAxisCoord({ xPx: 10, yPx: 100 })).toThrow(
      'The axisSet already filled.',
    )
  })
})

describe('2 points setting mode', () => {
  beforeEach(() => {
    axisSet.pointMode = 0
  })
  test('set axisSet', () => {
    axisSet.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
    expect(axisSet.x1.coord).toEqual({
      xPx: 100,
      yPx: 100,
    })
    expect(axisSet.y1.coord).toEqual({
      xPx: 100,
      yPx: 100,
    })
    axisSet.addAxisCoord({ xPx: 200, yPx: 200 }) // x1, y1
    expect(axisSet.x2.coord).toEqual({
      xPx: 200,
      yPx: 100,
    })
    expect(axisSet.y2.coord).toEqual({
      xPx: 100,
      yPx: 200,
    })
  })
  test('move active axis', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    axisSet.moveActiveAxis({ direction: 'up', distancePx: 10 })
    axisSet.moveActiveAxis({ direction: 'right', distancePx: 10 })
    axisSet.moveActiveAxis({ direction: 'down', distancePx: 20 })
    axisSet.moveActiveAxis({ direction: 'left', distancePx: 20 })
    expect(axisSet.x1.coord).toEqual({
      xPx: 0,
      yPx: 110,
    })
    expect(axisSet.y1.coord).toEqual({
      xPx: 0,
      yPx: 110,
    })
  })
})
