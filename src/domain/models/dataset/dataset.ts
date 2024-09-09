import { Vector } from '../axisSet/axisSetInterface'
import { DatasetInterface, Points, Point, Coord } from './datasetInterface'

export class Dataset implements DatasetInterface {
  name: string
  points: Points
  id: number
  tempPoints: Points = []
  activePointIds: number[] = []
  visiblePointIds: number[] = []
  manuallyAddedPointIds: number[] = []
  axisSetId: number = 1

  pointsAreAdjusting = false
  constructor(name: string, points: Points, id: number) {
    this.name = name
    this.points = points
    this.id = id
  }

  scaledPoints(scale: number): Points {
    return this.points.map((point) => {
      return {
        id: point.id,
        xPx: point.xPx * scale,
        yPx: point.yPx * scale,
      }
    })
  }

  scaledTempPoints(scale: number): Points {
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
    if (this.points.length === 0) {
      return 1
    }
    const biggestId = Math.max(...this.points.map((point) => point.id))
    return biggestId + 1
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

  get manuallyAddedPoints(): Points {
    return this.points.filter((point) =>
      this.manuallyAddedPointIds.includes(point.id),
    )
  }

  activatePointsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord) {
    this.inactivatePoints()

    const pointsToActivate = this.pointsInRectangleArea(
      topLeftCoord,
      bottomRightCoord,
    )
    pointsToActivate.forEach((point: Point) => {
      this.addActivatedPoint(point.id)
    })
  }

  moveTempPointToPoint(tempPointId: number): void {
    const tempPoint = this.tempPoints.find(
      (tempPoint) => tempPoint.id === tempPointId,
    )

    if (!tempPoint) return

    this.addPoint(tempPoint.xPx, tempPoint.yPx)
    this.clearTempPoint(tempPointId)
  }

  pointsInRectangleArea(topLeftCoord: Coord, bottomRightCoord: Coord): Points {
    return this.points.filter((point: Point) => {
      return (
        point.xPx >= topLeftCoord.xPx &&
        point.xPx <= bottomRightCoord.xPx &&
        point.yPx >= topLeftCoord.yPx &&
        point.yPx <= bottomRightCoord.yPx
      )
    })
  }

  pointsSortedByXAscending(): Points {
    return this.points.sort((a, b) => {
      return a.xPx - b.xPx
    })
  }

  pointsSortedByXDescending(): Points {
    return this.points.sort((a, b) => {
      return b.xPx - a.xPx
    })
  }

  pointsSortedByYAscending(): Points {
    return this.points.sort((a, b) => {
      return a.yPx - b.yPx
    })
  }

  pointsSortedByYDescending(): Points {
    return this.points.sort((a, b) => {
      return b.yPx - a.yPx
    })
  }

  pointsSortedByIdAscending(): Points {
    return this.points.sort((a, b) => {
      return a.id - b.id
    })
  }

  pointsSortedByIdDescending(): Points {
    return this.points.sort((a, b) => {
      return b.id - a.id
    })
  }

  setAxisSetId(id: number): void {
    this.axisSetId = id
  }
}
