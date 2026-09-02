import { AxisInterface } from '../axis/axisInterface'
import { Coord, PointMode } from '@/@types/types'

// TODO: Vector is also used in DatasetInterface, consider providing a shared type location for it
export type Vector = {
  direction: 'up' | 'down' | 'right' | 'left'
  distancePx: number
}

/**
 * AxisSet domain model
 * Represents a set of axes with their relationships and transformations
 */
export interface AxisSetInterface {
  id: number
  name: string
  x1: AxisInterface // <- this is a nested complex object
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
  activateAxisByName(axisName: string): void
  setX1Value(value: number): void
  setX2Value(value: number): void
  setY1Value(value: number): void
  setY2Value(value: number): void
  setXIsLogScale(value: boolean): void
  setYIsLogScale(value: boolean): void
}
