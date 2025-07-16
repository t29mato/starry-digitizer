import { Coord, Point } from '@/@types/types'
import { Vector } from '../axisSet/axisSetInterface'

export type Points = Point[]

export interface DatasetInterface {
  name: string
  points: Points
  id: number
  pointsAreAdjusting: boolean
  tempPoints: Points
  activePointIds: number[]
  axisSetId: number
  /**
   * INFO: Confirm interpolation: Delay finalization until user confirms via window.confirm.
   * If canceled, manual points are restored. Temporarily hides manual points during preview
   * by using 'visiblePointIds' state.
   */
  visiblePointIds: number[]
  manuallyAddedPointIds: number[]
  get nextPointId(): number
  get nextTempPointId(): number
  get lastPointId(): number
  get pointsAreActive(): boolean
  scaledPoints(scale: number): Points
  scaledTempPoints(scale: number): Points
  addPoint(xPx: number, yPx: number): void
  addTempPoint(xPx: number, yPx: number): void
  moveActivePoint(vector: Vector): void
  switchActivatedPoint(id: number): void
  addActivatedPoint(id: number): void
  hasActive(): boolean
  toggleActivatedPoint(toggledId: number): void
  clearPoint(id: number): void
  clearTempPoint(id: number): void
  clearPoints(): void
  inactivatePoints(): void
  clearActivePoints(): void
  activateAllPoints(): void
  addVisiblePointId(id: number): void
  removeVisiblePointId(id: number): void
  addManuallyAddedPointId(id: number): void
  removeManuallyAddedPointId(id: number): void
  get manuallyAddedPoints(): Points
  moveTempPointToPoint(tempPointId: number): void
  pointsSortedByXAscending(): Points
  activatePointsInRectangleArea(
    topLeftCoord: Coord,
    bottomRightCoord: Coord,
  ): void
  pointsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord): Points
  pointsSortedByXDescending(): Points
  pointsSortedByYAscending(): Points
  pointsSortedByYDescending(): Points
  pointsSortedByIdAscending(): Points
  pointsSortedByIdDescending(): Points
  setAxisSetId(id: number): void
}
