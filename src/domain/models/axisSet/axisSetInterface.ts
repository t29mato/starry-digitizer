import { Coord } from '../dataset/datasetInterface'
import { AxisInterface } from '../axis/axisInterface'
import { PointMode } from '@/@types/types'

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
  xIsLogScale: boolean
  yIsLogScale: boolean
  activeAxisName: string
  pointMode: PointMode
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
  setXIsLogScale(value: boolean): void
  setYIsLogScale(value: boolean): void
}
