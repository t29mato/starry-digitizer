import { Coord, MarkerStyle, Point } from '@/@types/types'
import { Vector } from '../axisSet/axisSetInterface'
import { DatasetInterface } from './datasetInterface'
import { findDuplicateClusters } from '@/domain/services/duplicatePointFinder'
import { isPointInPolygon } from '@/domain/services/polygon'

export class Dataset implements DatasetInterface {
  name: string
  color?: string
  points: Point[]
  id: number
  tempPoints: Point[] = []
  activePointIds: number[] = []
  visiblePointIds: number[] = []
  manuallyAddedPointIds: number[] = []
  axisSetId: number = 1
  marker?: MarkerStyle
  // INFO: points taken out by removePointsBelowScore(), kept so that
  // restoreScoreRemovedPoints() can put them back (docs/design/
  // auto-extraction-review-design.md, "まとめて消す・戻す")
  scoreRemovedPoints: Point[] = []

  pointsAreAdjusting = false
  constructor(name: string, points: Point[], id: number, color?: string) {
    this.name = name
    this.points = points
    this.id = id
    this.color = color
  }

  scaledPoints(scale: number): Point[] {
    // INFO: spread so score/origin reach the renderer (low-confidence color)
    return this.points.map((point) => {
      return {
        ...point,
        xPx: point.xPx * scale,
        yPx: point.yPx * scale,
      }
    })
  }

  scaledTempPoints(scale: number): Point[] {
    return this.tempPoints.map((point) => {
      return {
        id: point.id,
        xPx: point.xPx * scale,
        yPx: point.yPx * scale,
      }
    })
  }

  get pointsAreActive(): boolean {
    return this.activePointIds.length > 0
  }

  addPoint(xPx: number, yPx: number) {
    this.activePointIds.length = 0
    this.activePointIds.push(this.nextPointId)
    this.visiblePointIds.push(this.nextPointId)
    this.points.push({
      id: this.nextPointId,
      xPx,
      yPx,
    })
  }

  get nextPointId(): number {
    // INFO: score-removed points still own their ids — they come back
    const ids = [...this.points, ...this.scoreRemovedPoints].map((p) => p.id)
    if (ids.length === 0) {
      return 1
    }
    return Math.max(...ids) + 1
  }

  get lastPointId(): number {
    const lastPoint = this.points[this.points.length - 1]

    if (!lastPoint) return -1

    return lastPoint.id
  }

  switchActivatedPoint(id: number) {
    this.activePointIds.length = 0
    this.activePointIds.push(id)
  }

  addActivatedPoint(id: number) {
    this.activePointIds.push(id)
  }

  //INFO クリックされたpointがactiveな場合はinactiveにし、そうでない場合はactive状態に追加する
  toggleActivatedPoint(toggledId: number) {
    if (this.activePointIds.includes(toggledId)) {
      const activePointIds = this.activePointIds.filter((id) => {
        return id !== toggledId
      })
      this.activePointIds.length = 0
      this.activePointIds.push(...activePointIds)
      return
    }

    this.addActivatedPoint(toggledId)
  }

  clearPoint(id: number) {
    this.points = this.points.filter((point) => {
      return id !== point.id
    })
    this.activePointIds.length = 0

    this.removeVisiblePointId(id)
    this.removeManuallyAddedPointId(id)
  }

  clearPoints() {
    this.points.forEach((point) => this.clearPoint(point.id))
  }

  inactivatePoints() {
    this.activePointIds = []
  }

  clearActivePoints() {
    this.points = this.points.filter((point) => {
      return !this.activePointIds.includes(point.id)
    })
    this.activePointIds.length = 0
  }

  activateAllPoints() {
    this.activePointIds = this.points.map((point) => point.id)
  }

  hasActive(): boolean {
    return this.activePointIds.length > 0
  }

  moveActivePoint(vector: Vector) {
    const ids = this.activePointIds
    this.pointsAreAdjusting = true
    switch (vector.direction) {
      case 'up':
        this.points
          .filter((point) => ids.includes(point.id))
          .map((point) => (point.yPx -= vector.distancePx))
        break
      case 'right':
        this.points
          .filter((point) => ids.includes(point.id))
          .map((point) => (point.xPx += vector.distancePx))
        break
      case 'down':
        this.points
          .filter((point) => ids.includes(point.id))
          .map((point) => (point.yPx += vector.distancePx))
        break
      case 'left':
        this.points
          .filter((point) => ids.includes(point.id))
          .map((point) => (point.xPx -= vector.distancePx))
        break
    }
  }

  addTempPoint(xPx: number, yPx: number) {
    this.tempPoints.push({
      id: this.nextTempPointId,
      xPx,
      yPx,
    })
  }

  get nextTempPointId(): number {
    if (this.tempPoints.length === 0) {
      return 1
    }
    const biggestId = Math.max(...this.tempPoints.map((point) => point.id))
    return biggestId + 1
  }

  clearTempPoint(id: number) {
    this.tempPoints = this.tempPoints.filter((tempPoint) => tempPoint.id !== id)
  }

  addVisiblePointId(id: number): void {
    if (this.visiblePointIds.includes(id)) return
    this.visiblePointIds.push(id)
  }

  removeVisiblePointId(id: number): void {
    this.visiblePointIds = this.visiblePointIds.filter((pId) => pId !== id)
  }

  addManuallyAddedPointId(id: number): void {
    if (this.manuallyAddedPointIds.includes(id)) return
    this.manuallyAddedPointIds.push(id)
  }

  removeManuallyAddedPointId(id: number): void {
    this.manuallyAddedPointIds = this.manuallyAddedPointIds.filter(
      (pId) => pId !== id,
    )
  }

  get manuallyAddedPoints(): Point[] {
    return this.points.filter((point) =>
      this.manuallyAddedPointIds.includes(point.id),
    )
  }

  activatePointsInRectangleArea(
    topLeftCoord: Coord,
    bottomRightCoord: Coord,
    additive = false,
  ) {
    activatePoints(
      this,
      this.pointsInRectangleArea(topLeftCoord, bottomRightCoord),
      additive,
    )
  }

  activatePointsInPolygon(polygon: Coord[], additive = false) {
    activatePoints(
      this,
      this.points.filter((point) => isPointInPolygon(point, polygon)),
      additive,
    )
  }

  // INFO: Moves points in from another dataset. Ids are only unique within
  // a dataset, so they are renumbered; origin/score travel with the point,
  // which is what lets the edit log see a move between series. Returns the
  // new ids.
  appendPoints(points: Point[]): number[] {
    const newIds: number[] = []
    points.forEach((point) => {
      const id = this.nextPointId
      this.points.push({ ...point, id })
      this.addVisiblePointId(id)
      newIds.push(id)
    })
    return newIds
  }

  // INFO: Removes and returns the given points (for appendPoints elsewhere)
  takePoints(ids: number[]): Point[] {
    const taken = this.points.filter((point) => ids.includes(point.id))
    this.points = this.points.filter((point) => !ids.includes(point.id))
    this.activePointIds = this.activePointIds.filter((id) => !ids.includes(id))
    this.visiblePointIds = this.visiblePointIds.filter(
      (id) => !ids.includes(id),
    )
    this.manuallyAddedPointIds = this.manuallyAddedPointIds.filter(
      (id) => !ids.includes(id),
    )
    return taken
  }

  // INFO: Collapses each group of points within maxDistancePx of a
  // representative into the representative, moved to the group's centroid
  // (see duplicatePointFinder.ts). Returns how many points were removed.
  mergeDuplicatePoints(maxDistancePx: number): number {
    const clusters = findDuplicateClusters(this.points, maxDistancePx)
    const removedIds: number[] = []
    clusters.forEach(({ representative, members }) => {
      const n = members.length
      representative.xPx = members.reduce((sum, p) => sum + p.xPx, 0) / n
      representative.yPx = members.reduce((sum, p) => sum + p.yPx, 0) / n
      members
        .filter((p) => p.id !== representative.id)
        .forEach((p) => removedIds.push(p.id))
    })
    this.takePoints(removedIds)
    return removedIds.length
  }

  // INFO: Points without a score are never touched. Returns how many moved.
  removePointsBelowScore(threshold: number): number {
    const ids = this.points
      .filter((p) => p.score !== undefined && p.score < threshold)
      .map((p) => p.id)
    this.scoreRemovedPoints.push(...this.takePoints(ids))
    return ids.length
  }

  restoreScoreRemovedPoints(): number {
    const restored = this.scoreRemovedPoints
    this.scoreRemovedPoints = []
    restored.forEach((point) => {
      this.points.push(point)
      this.addVisiblePointId(point.id)
    })
    return restored.length
  }

  moveTempPointToPoint(tempPointId: number): void {
    const tempPoint = this.tempPoints.find(
      (tempPoint) => tempPoint.id === tempPointId,
    )

    if (!tempPoint) return

    this.addPoint(tempPoint.xPx, tempPoint.yPx)
    this.clearTempPoint(tempPointId)
  }

  pointsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord): Point[] {
    return this.points.filter((point: Point) => {
      return (
        point.xPx >= topLeftCoord.xPx &&
        point.xPx <= bottomRightCoord.xPx &&
        point.yPx >= topLeftCoord.yPx &&
        point.yPx <= bottomRightCoord.yPx
      )
    })
  }

  pointsSortedByXAscending(): Point[] {
    return this.points.sort((a, b) => {
      return a.xPx - b.xPx
    })
  }

  pointsSortedByXDescending(): Point[] {
    return this.points.sort((a, b) => {
      return b.xPx - a.xPx
    })
  }

  pointsSortedByYAscending(): Point[] {
    return this.points.sort((a, b) => {
      return a.yPx - b.yPx
    })
  }

  pointsSortedByYDescending(): Point[] {
    return this.points.sort((a, b) => {
      return b.yPx - a.yPx
    })
  }

  pointsSortedByIdAscending(): Point[] {
    return this.points.sort((a, b) => {
      return a.id - b.id
    })
  }

  pointsSortedByIdDescending(): Point[] {
    return this.points.sort((a, b) => {
      return b.id - a.id
    })
  }

  setAxisSetId(id: number): void {
    this.axisSetId = id
  }
}

// INFO: module-level rather than a private method so Dataset stays
// structurally identical to DatasetInterface
function activatePoints(
  dataset: Dataset,
  points: Point[],
  additive: boolean,
): void {
  if (!additive) {
    dataset.inactivatePoints()
  }
  points.forEach((point: Point) => {
    if (!dataset.activePointIds.includes(point.id)) {
      dataset.addActivatedPoint(point.id)
    }
  })
}
