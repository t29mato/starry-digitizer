import { Axes } from './axes'
import { Axis } from './axis'
import { AxisInterface } from './axisInterface'

let x1: AxisInterface
let x2: AxisInterface
let y1: AxisInterface
let y2: AxisInterface
let axes: Axes
beforeEach(() => {
  x1 = new Axis('x1', 0)
  x2 = new Axis('x2', 1)
  y1 = new Axis('y1', 0)
  y2 = new Axis('y2', 1)
  axes = new Axes(x1, x2, y1, y2)
})

test('it has at least one axis', () => {
  expect(axes.hasAtLeastOneAxis).toBe(false)
  axes.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.hasAtLeastOneAxis).toBe(true)
  axes.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
  axes.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.hasAtLeastOneAxis).toBe(true)
  axes.clearAxesCoords()
  expect(axes.hasAtLeastOneAxis).toBe(false)
})

test('x1 and y1 coordinates are same', () => {
  axes.addAxisCoord({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.x1.coord).toEqual({
    xPx: 100,
    yPx: 100,
  })
  expect(axes.y1.coord).toEqual({
    xPx: 100,
    yPx: 100,
  })
})

test('x1 and y1 coordinates are not same', () => {
  axes.x1IsSameAsY1 = false
  axes.addAxisCoord({ xPx: 100, yPx: 100 }) // x1
  expect(axes.x1.coord).toEqual({
    xPx: 100,
    yPx: 100,
  })
  expect(axes.y1.coord).toBeUndefined()
})

test('active axis', () => {
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x2)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y2)
})

test('active axis when x1 and y1 coordinates are not same', () => {
  axes.x1IsSameAsY1 = false
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x2)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y1)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y2)
})

test('inactivate axis', () => {
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.inactivateAxis()
  expect(axes.activeAxis).toBeNull()
})

test('next axis', () => {
  expect(axes.nextAxis).toEqual(axes.x1)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toEqual(axes.x2)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toEqual(axes.y2)
  axes.addAxisCoord({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toBeNull()
})

test('move active axis', () => {
  expect(() => axes.moveActiveAxis('ArrowUp')).toThrow(
    "active axis's coord is undefined"
  )
  axes.addAxisCoord({ xPx: 10, yPx: 100 })
  axes.moveActiveAxis('ArrowUp')
  expect(axes.x1.coord && axes.x1.coord.yPx).toBe(99)
  axes.moveActiveAxis('ArrowDown')
  expect(axes.x1.coord && axes.x1.coord.yPx).toBe(100)
  axes.moveActiveAxis('ArrowLeft')
  expect(axes.x1.coord && axes.x1.coord.xPx).toBe(9)
  axes.moveActiveAxis('ArrowRight')
  expect(axes.x1.coord && axes.x1.coord.xPx).toBe(10)
  expect(() => axes.moveActiveAxis('WrongArrow')).toThrow(
    'undefined arrow: WrongArrow'
  )
})

test('add axis coodinate when all axes are filled', () => {
  axes.addAxisCoord({ xPx: 10, yPx: 100 })
  axes.addAxisCoord({ xPx: 10, yPx: 100 })
  axes.addAxisCoord({ xPx: 10, yPx: 100 })
  expect(() => axes.addAxisCoord({ xPx: 10, yPx: 100 })).toThrow(
    'The axes already filled.'
  )
})
