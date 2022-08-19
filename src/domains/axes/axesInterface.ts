import { Coord } from '../datasetInterface'
import { AxisInterface } from './axisInterface'

export interface AxesInterface {
  x1: AxisInterface
  x2: AxisInterface
  y1: AxisInterface
  y2: AxisInterface
  xIsLog: boolean
  yIsLog: boolean
  activeAxisName: string
  x1IsSameAsY1: boolean

  get hasAtLeastOneAxis(): boolean
  get activeAxis(): AxisInterface | null
  get nextAxis(): AxisInterface | null
  moveActiveAxis(arrow: string): void
  clearAxesCoords(): void
  addAxisCoord(coord: Coord): void
  inactivateAxis(): void
}
