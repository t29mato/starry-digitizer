import { Coord } from '@/@types/types'

export interface AxisInterface {
  name: string
  coord: Coord
  value: number
  initialCoord: Coord
  clearCoord(): void
  get coordIsFilled(): boolean
}
