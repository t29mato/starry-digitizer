import { Coord } from '../dataset/datasetInterface'
import { AxisInterface } from '../axis/axisInterface'

// TODO: VectorはDatasetInterfaceでも利用しており共通Typeの場所を用意するべきか検討する
export type Vector = {
  direction: 'up' | 'down' | 'right' | 'left'
  distancePx: number
}

export interface AxisSetInterface {
  id: number
  name: string
  x1: AxisInterface
  x2: AxisInterface
  y1: AxisInterface
  y2: AxisInterface
  x2y2: AxisInterface
  xIsLog: boolean
  yIsLog: boolean
  activeAxisName: string
  pointMode: number // INFO: {0: '2Points', 1: '4Points'}
  considerGraphTilt: boolean
  isAdjusting: boolean
  isVisible: boolean

  get hasAtLeastOneAxis(): boolean
  get hasXAxis(): boolean
  get hasYAxis(): boolean
  get atLeastOneCoordOrValueIsChanged(): boolean
  get activeAxis(): AxisInterface | null
  get nextAxis(): AxisInterface | null
  moveActiveAxis(vector: Vector): void
  clearAxisCoords(): void
  clearXAxisCoords(): void
  clearYAxisCoords(): void
  addAxisCoord(coord: Coord): void
  inactivateAxis(): void
  setX1Value(value: number): void
  setX2Value(value: number): void
  setY1Value(value: number): void
  setY2Value(value: number): void
  setXIsLog(value: boolean): void
  setYIsLog(value: boolean): void
}
