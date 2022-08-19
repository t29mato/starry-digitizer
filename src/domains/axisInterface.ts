import { Coord } from './datasetInterface'
export interface AxisInterface {
  name: string
  coord?: Coord
  value: number
  clearCoord(): void
}
