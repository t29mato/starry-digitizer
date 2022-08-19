import { AxisInterface } from './axisInterface'
import { Coord } from './datasetInterface'
export class Axis implements AxisInterface {
  name: string
  coord?: Coord
  value: number
  constructor(name: string, value: number) {
    this.name = name
    this.value = value
  }

  clearCoord() {
    this.coord = undefined
  }
}
