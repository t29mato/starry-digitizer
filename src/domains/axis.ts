import { Coord } from './datasetInterface'
export class Axis {
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
