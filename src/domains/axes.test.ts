import { Axes } from './axes'

test('it has at least one axis', () => {
  const axes = new Axes()
  expect(axes.hasAtLeastOneAxis).toBe(false)
  axes.addAxisPosition({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.hasAtLeastOneAxis).toBe(true)
  axes.addAxisPosition({ xPx: 100, yPx: 100 }) // x1, y1
  axes.addAxisPosition({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.hasAtLeastOneAxis).toBe(true)
  axes.clearAxesCoords()
  expect(axes.hasAtLeastOneAxis).toBe(false)
})

test('x1 and y1 coordinates are same', () => {
  const axes = new Axes()
  axes.addAxisPosition({ xPx: 100, yPx: 100 }) // x1, y1
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
  const axes = new Axes()
  axes.x1IsSameAsY1 = false
  axes.addAxisPosition({ xPx: 100, yPx: 100 }) // x1, y1
  expect(axes.x1.coord).toEqual({
    xPx: 100,
    yPx: 100,
  })
  expect(axes.y1.coord).toBeUndefined()
})

test('active axis', () => {
  const axes = new Axes()
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x2)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y2)
})

test('active axis when x1 and y1 coordinates are not same', () => {
  const axes = new Axes()
  axes.x1IsSameAsY1 = false
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x2)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y1)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.y2)
})

test('inactivate axis', () => {
  const axes = new Axes()
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.activeAxis).toEqual(axes.x1)
  axes.inactivateAxis()
  expect(axes.activeAxis).toBeNull()
})

test('next axis', () => {
  const axes = new Axes()
  expect(axes.nextAxis).toEqual(axes.x1)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toEqual(axes.x2)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toEqual(axes.y2)
  axes.addAxisPosition({ xPx: 100, yPx: 100 })
  expect(axes.nextAxis).toBeNull()
})

test('move active axis', () => {
  const axes = new Axes()
  expect(() => axes.moveActiveAxis('ArrowUp')).toThrow(
    "active axis's coord is undefined"
  )
  axes.addAxisPosition({ xPx: 10, yPx: 100 })
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
  const axes = new Axes()
  axes.addAxisPosition({ xPx: 10, yPx: 100 })
  axes.addAxisPosition({ xPx: 10, yPx: 100 })
  axes.addAxisPosition({ xPx: 10, yPx: 100 })
  expect(() => axes.addAxisPosition({ xPx: 10, yPx: 100 })).toThrow(
    'The axes already filled.'
  )
})
