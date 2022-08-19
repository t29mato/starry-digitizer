import { Axis } from './axis'
import { Coord } from './datasetInterface'

export class Axes {
  x1: Axis = new Axis('x1', 0)
  x2: Axis = new Axis('x2', 1)
  y1: Axis = new Axis('y1', 0)
  y2: Axis = new Axis('y2', 1)
  xIsLog = false
  yIsLog = false
  error = ''
  activeAxisName = ''
  x1IsSameAsY1 = true

  get hasAtLeastOneAxis(): boolean {
    return !!(this.x1.coord || this.x2.coord || this.y1.coord || this.y2.coord)
  }

  get activeAxis(): Axis | null {
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

  get nextAxis(): Axis | null {
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
