import { Coord } from '../datasetInterface'

export interface AxisInterface {
  name: string
  coord: Coord
  value: number
  initialCoord: Coord
  isTemporaryCoord: boolean
  clearCoord(): void
  get coordIsFilled(): boolean
}
