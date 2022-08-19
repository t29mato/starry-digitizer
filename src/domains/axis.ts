import { Position } from './datasetInterface'
export class Axis {
  name: string
  coord?: Position
  value: number
  constructor(name: string, value: number) {
    this.name = name
    this.value = value
  }

  clearCoord() {
    this.coord = undefined
  }
}
