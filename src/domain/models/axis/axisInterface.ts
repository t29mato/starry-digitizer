import { Coord } from '../dataset/datasetInterface'

export interface AxisInterface {
  name: string
  coord: Coord
  value: number
  initialCoord: Coord
  clearCoord(): void
  get coordIsFilled(): boolean
}
