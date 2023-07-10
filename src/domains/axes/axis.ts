import { Coord } from '../datasetInterface'
import { AxisInterface } from './axisInterface'
export class Axis implements AxisInterface {
  name: string
  value: number
  coord: Coord
  initialCoord = {
    xPx: -999,
    yPx: -999,
  }
  isTemporaryCoord: boolean

  constructor(name: string, value: number, coord?: Coord) {
    this.name = name
    this.value = value
    this.coord = coord || this.initialCoord
    this.isTemporaryCoord = false
  }

  clearCoord() {
    this.coord = this.initialCoord
  }

  get coordIsFilled(): boolean {
    return this.coord.xPx + this.coord.yPx > 0
  }
}
