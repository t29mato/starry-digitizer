import { Coord } from '../datasetInterface'
import { AxesInterface, Vector } from './axesInterface'
import { AxisInterface } from './axisInterface'

export class Axes implements AxesInterface {
  x1: AxisInterface
  x2: AxisInterface
  y1: AxisInterface
  y2: AxisInterface
  xIsLog = false
  yIsLog = false
  activeAxisName = ''
  x1IsSameAsY1 = true
  isAdjusting = false

  constructor(
    x1: AxisInterface,
    x2: AxisInterface,
    y1: AxisInterface,
    y2: AxisInterface
  ) {
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
  }

  get hasAtLeastOneAxis(): boolean {
    return !!(
      this.x1.coordIsFilled ||
      this.x2.coordIsFilled ||
      this.y1.coordIsFilled ||
      this.y2.coordIsFilled
    )
  }

  get hasXAxis(): boolean {
    return this.x1.coordIsFilled || this.x2.coordIsFilled
  }

  get hasYAxis(): boolean {
    return this.y1.coordIsFilled || this.y2.coordIsFilled
  }

  get activeAxis(): AxisInterface | null {
    switch (this.activeAxisName) {
      case 'x1':
        return this.x1
      case 'x2':
        return this.x2
      case 'y1':
        return this.y1
      case 'y2':
        return this.y2
      default:
        return null
    }
  }

  get nextAxis(): AxisInterface | null {
    if (!this.x1.coordIsFilled) {
      return this.x1
    }
    if (!this.x2.coordIsFilled) {
      return this.x2
    }
    if (!this.y1.coordIsFilled) {
      return this.y1
    }
    if (!this.y2.coordIsFilled) {
      return this.y2
    }
    return null
  }

  moveActiveAxis(vector: Vector) {
    if (!this.activeAxis || !this.activeAxis.coord) {
      throw new Error("active axis's coord is undefined")
    }
    this.isAdjusting = true
    switch (vector.direction) {
      case 'up':
        this.activeAxis.coord.yPx -= vector.distancePx
        break
      case 'right':
        this.activeAxis.coord.xPx += vector.distancePx
        break
      case 'down':
        this.activeAxis.coord.yPx += vector.distancePx
        break
      case 'left':
        this.activeAxis.coord.xPx -= vector.distancePx
        break
      default:
        throw new Error(`undefined direction: ${vector.direction}`)
    }
  }

  clearAxesCoords() {
    this.x1.clearCoord()
    this.x2.clearCoord()
    this.y1.clearCoord()
    this.y2.clearCoord()
    this.activeAxisName = ''
  }

  clearXAxisCoords() {
    this.x1.clearCoord()
    this.x2.clearCoord()
    this.activeAxisName = ''
  }

  clearYAxisCoords() {
    this.y1.clearCoord()
    this.y2.clearCoord()
    this.activeAxisName = ''
  }

  addAxisCoord(coord: Coord) {
    if (!this.nextAxis) {
      throw new Error('The axes already filled.')
    }
    this.activeAxisName = this.nextAxis.name
    this.nextAxis.coord = coord
    if (this.activeAxisName === 'x1' && this.x1IsSameAsY1) {
      this.y1.coord = Object.assign(coord)
    }
  }

  inactivateAxis() {
    this.activeAxisName = ''
  }
}
