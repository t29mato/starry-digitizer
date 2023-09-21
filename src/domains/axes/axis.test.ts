import { expect, test } from '@jest/globals'
import { Axis } from './axis'

test('clear coordinates', () => {
  const axis = new Axis('x1', 0)
  axis.coord = { xPx: 100, yPx: 100 }
  expect(axis.coord).toEqual({ xPx: 100, yPx: 100 })
  axis.clearCoord()
  expect(axis.coord).toEqual(axis.initialCoord)
})
