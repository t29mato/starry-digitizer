import { Axes } from './axes/axes'
import { Axis } from './axes/axis'
import XYAxesCalculator from './XYAxesCalculator'

const x1 = new Axis('x1', 0)
const x2 = new Axis('x2', 0)
const y1 = new Axis('y1', 0)
const y2 = new Axis('y2', 0)
const axes = new Axes(x1, x2, y1, y2)

test('DO write xy axes calculator test', () => {
  const calculator = new XYAxesCalculator(axes, { x: false, y: false })
})
