import { Coord } from '../datasetInterface'
import { AxisInterface } from './axisInterface'

export class Axes {
  x1: AxisInterface
  x2: AxisInterface
  y1: AxisInterface
  y2: AxisInterface
  xIsLog = false
  yIsLog = false
  activeAxisName = ''
  x1IsSameAsY1 = true

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
    return !!(this.x1.coord || this.x2.coord || this.y1.coord || this.y2.coord)
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
    if (!this.x1.coord) {
      return this.x1
    }
    if (!this.x2.coord) {
      return this.x2
    }
    if (!this.y1.coord) {
      return this.y1
    }
    if (!this.y2.coord) {
      return this.y2
    }
    return null
  }

  moveActiveAxis(arrow: string) {
    if (!this.activeAxis || !this.activeAxis.coord) {
      throw new Error("active axis's coord is undefined")
    }
    switch (arrow) {
      case 'ArrowUp':
        this.activeAxis.coord.yPx--
        break
      case 'ArrowRight':
        this.activeAxis.coord.xPx++
        break
      case 'ArrowDown':
        this.activeAxis.coord.yPx++
        break
      case 'ArrowLeft':
        this.activeAxis.coord.xPx--
        break
      default:
        throw new Error(`undefined arrow: ${arrow}`)
    }
  }

  clearAxesCoords() {
    this.x1.clearCoord()
    this.x2.clearCoord()
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
