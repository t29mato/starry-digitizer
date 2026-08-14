import { expect } from '@jest/globals'
import { AxisSet } from './axisSet'
import { Axis } from '../axis/axis'
import { AxisInterface } from '../axis/axisInterface'
import { POINT_MODE } from '../../constants'

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
    axisSet.pointMode = POINT_MODE.FOUR_POINTS
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
    axisSet.pointMode = POINT_MODE.TWO_POINTS
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

  test('defining x1,y1 then x2,y2 together activates the x2y2 virtual axis', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 }) // x1, y1
    axisSet.addAxisCoord({ xPx: 20, yPx: 200 }) // x2y2 (virtual)
    expect(axisSet.activeAxisName).toBe('x2y2')
    expect(axisSet.activeAxis).toEqual(axisSet.x2y2)
    expect(axisSet.x2y2.coord).toEqual({ xPx: 20, yPx: 200 })
    expect(axisSet.x2.coord).toEqual({ xPx: 20, yPx: 100 })
    expect(axisSet.y2.coord).toEqual({ xPx: 10, yPx: 200 })
  })

  test('moving the x2y2 virtual axis also moves its companion axis in each direction', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 }) // x1, y1
    axisSet.addAxisCoord({ xPx: 20, yPx: 200 }) // x2y2

    axisSet.moveActiveAxis({ direction: 'up', distancePx: 5 })
    expect(axisSet.x2y2.coord.yPx).toBe(195)
    expect(axisSet.y2.coord.yPx).toBe(195)

    axisSet.moveActiveAxis({ direction: 'down', distancePx: 5 })
    expect(axisSet.x2y2.coord.yPx).toBe(200)
    expect(axisSet.y2.coord.yPx).toBe(200)

    axisSet.moveActiveAxis({ direction: 'right', distancePx: 3 })
    expect(axisSet.x2y2.coord.xPx).toBe(23)
    expect(axisSet.x2.coord.xPx).toBe(23)

    axisSet.moveActiveAxis({ direction: 'left', distancePx: 3 })
    expect(axisSet.x2y2.coord.xPx).toBe(20)
    expect(axisSet.x2.coord.xPx).toBe(20)
  })

  test('moveActiveAxis throws on an undefined direction', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 })
    expect(() =>
      // INFO: intentionally passing an invalid direction to exercise the
      // `default` branch, which is unreachable through the Vector type alone.
      axisSet.moveActiveAxis({
        direction: 'diagonal' as unknown as 'up',
        distancePx: 1,
      }),
    ).toThrow('undefined direction: diagonal')
  })

  test('clearXAxisCoords clears x1/x2/x2y2 but leaves y1/y2 untouched', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 }) // x1, y1
    axisSet.addAxisCoord({ xPx: 20, yPx: 200 }) // x2y2
    axisSet.clearXAxisCoords()
    expect(axisSet.x1.coordIsFilled).toBe(false)
    expect(axisSet.x2.coordIsFilled).toBe(false)
    expect(axisSet.x2y2.coordIsFilled).toBe(false)
    expect(axisSet.y1.coordIsFilled).toBe(true)
    expect(axisSet.activeAxisName).toBe('')
  })

  test('clearYAxisCoords only clears the Y-related axes', () => {
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 }) // x1, y1
    axisSet.addAxisCoord({ xPx: 20, yPx: 200 }) // x2y2
    axisSet.clearYAxisCoords()
    expect(axisSet.x1.coordIsFilled).toBe(true)
    expect(axisSet.x2.coordIsFilled).toBe(true)
    expect(axisSet.y2.coordIsFilled).toBe(false)
    expect(axisSet.x2y2.coordIsFilled).toBe(false)
    expect(axisSet.activeAxisName).toBe('')
  })
})

describe('getters', () => {
  test('hasXAxis / hasYAxis reflect whether either paired axis has a coordinate', () => {
    expect(axisSet.hasXAxis).toBe(false)
    expect(axisSet.hasYAxis).toBe(false)
    axisSet.addAxisCoord({ xPx: 10, yPx: 100 }) // x1, y1
    expect(axisSet.hasXAxis).toBe(true)
    expect(axisSet.hasYAxis).toBe(true)
  })

  test('atLeastOneCoordOrValueIsChanged is true once a coord is set or a value differs from its default', () => {
    expect(axisSet.atLeastOneCoordOrValueIsChanged).toBe(false)
    axisSet.setX1Value(5)
    expect(axisSet.atLeastOneCoordOrValueIsChanged).toBe(true)
  })
})

describe('activateAxisByName', () => {
  test('sets activeAxisName when given a valid axis name', () => {
    axisSet.activateAxisByName('y2')
    expect(axisSet.activeAxisName).toBe('y2')
  })

  test('leaves activeAxisName unchanged when given an invalid axis name', () => {
    axisSet.activateAxisByName('x1')
    axisSet.activateAxisByName('not-a-real-axis')
    expect(axisSet.activeAxisName).toBe('x1')
  })
})

describe('value / log-scale setters', () => {
  test('setX1Value / setX2Value / setY1Value / setY2Value update the respective axis value', () => {
    axisSet.setX1Value(11)
    axisSet.setX2Value(12)
    axisSet.setY1Value(13)
    axisSet.setY2Value(14)
    expect(axisSet.x1.value).toBe(11)
    expect(axisSet.x2.value).toBe(12)
    expect(axisSet.y1.value).toBe(13)
    expect(axisSet.y2.value).toBe(14)
  })

  test('setXIsLogScale / setYIsLogScale toggle the log-scale flags', () => {
    expect(axisSet.xIsLogScale).toBe(false)
    expect(axisSet.yIsLogScale).toBe(false)
    axisSet.setXIsLogScale(true)
    axisSet.setYIsLogScale(true)
    expect(axisSet.xIsLogScale).toBe(true)
    expect(axisSet.yIsLogScale).toBe(true)
  })
})
