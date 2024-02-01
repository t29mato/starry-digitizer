import { Coord } from '../../models/dataset/datasetInterface'
import { AxisRepositoryInterface, Vector } from './axisRepositoryInterface'
import { AxisInterface } from '../../models/axis/axisInterface'

export class AxisRepository implements AxisRepositoryInterface {
  x1: AxisInterface
  x2: AxisInterface
  y1: AxisInterface
  y2: AxisInterface
  x2y2: AxisInterface //x2, y2を同時調整するために使う仮想軸
  xIsLog = false
  yIsLog = false
  activeAxisName = ''
  pointMode = 0 // INFO: {0: '2Points', 1: '4Points'}
  considerGraphTilt = false
  isAdjusting = false

  constructor(
    x1: AxisInterface,
    x2: AxisInterface,
    y1: AxisInterface,
    y2: AxisInterface,
    x2y2: AxisInterface,
  ) {
    this.x1 = x1
    this.x2 = x2
    this.y1 = y1
    this.y2 = y2
    this.x2y2 = x2y2
  }

  get hasAtLeastOneAxis(): boolean {
    return !!(
      this.x1.coordIsFilled ||
      this.x2.coordIsFilled ||
      this.y1.coordIsFilled ||
      this.y2.coordIsFilled
    )
  }

  get hasXAxis(): boolean {
    return this.x1.coordIsFilled || this.x2.coordIsFilled
  }

  get hasYAxis(): boolean {
    return this.y1.coordIsFilled || this.y2.coordIsFilled
  }

  get hasOnlyX1Y1Axes(): boolean {
    return (
      this.x1.coordIsFilled &&
      this.y1.coordIsFilled &&
      !this.x2.coordIsFilled &&
      !this.y2.coordIsFilled
    )
  }

  get activeAxis(): AxisInterface | null {
    switch (this.activeAxisName) {
      case 'x1':
        return this.x1
      case 'x2':
        return this.x2
      case 'y1':
        return this.y1
      case 'y2':
        return this.y2
      case 'x2y2':
        return this.x2y2
      default:
        return null
    }
  }

  get nextAxis(): AxisInterface | null {
    //INFO: 以下の条件の時はx2,y2を同時に定義するモードに入る
    if (this.pointMode === 0 && this.hasOnlyX1Y1Axes) {
      return this.x2y2
    }

    if (!this.x1.coordIsFilled) {
      return this.x1
    }
    if (!this.x2.coordIsFilled) {
      return this.x2
    }
    if (!this.y1.coordIsFilled) {
      return this.y1
    }
    if (!this.y2.coordIsFilled) {
      return this.y2
    }
    return null
  }

  moveActiveAxis(vector: Vector) {
    if (!this.activeAxis || !this.activeAxis.coord) {
      throw new Error("active axis's coord is undefined")
    }
    this.isAdjusting = true

    switch (vector.direction) {
      case 'up':
        this.activeAxis.coord.yPx -= vector.distancePx

        if (this.activeAxis.name === 'x2y2') {
          this.y2.coord.yPx -= vector.distancePx
        }
        break
      case 'right':
        this.activeAxis.coord.xPx += vector.distancePx

        if (this.activeAxis.name === 'x2y2') {
          this.x2.coord.xPx += vector.distancePx
        }
        break
      case 'down':
        this.activeAxis.coord.yPx += vector.distancePx

        if (this.activeAxis.name === 'x2y2') {
          this.y2.coord.yPx += vector.distancePx
        }
        break
      case 'left':
        this.activeAxis.coord.xPx -= vector.distancePx

        if (this.activeAxis.name === 'x2y2') {
          this.x2.coord.xPx -= vector.distancePx
        }
        break
      default:
        throw new Error(`undefined direction: ${vector.direction}`)
    }
  }

  clearAxisCoords() {
    this.x1.clearCoord()
    this.x2.clearCoord()
    this.y1.clearCoord()
    this.y2.clearCoord()
    this.x2y2.clearCoord()
    this.activeAxisName = ''
  }

  clearXAxisCoords() {
    this.x1.clearCoord()
    this.x2.clearCoord()
    this.x2y2.clearCoord()
    this.activeAxisName = ''
  }

  clearYAxisCoords() {
    this.y1.clearCoord()
    this.y2.clearCoord()
    this.x2y2.clearCoord()
    this.activeAxisName = ''
  }

  addAxisCoord(coord: Coord) {
    if (!this.nextAxis) {
      throw new Error('The axes already filled.')
    }

    this.activeAxisName = this.nextAxis.name

    //INFO: a. 2点定義モードで、、x1を定義する時は同時にy1を定義して終了する
    if (this.activeAxisName === 'x1' && this.pointMode === 0) {
      this.x1.coord = Object.assign(coord)
      this.y1.coord = Object.assign(coord)
      return
    }

    //INFO: b. x2, y2同時定義モードの場合は両方定義して終了する
    if (this.activeAxisName === 'x2y2') {
      this.x2y2.coord = Object.assign(coord)
      this.x2.coord = { xPx: coord.xPx, yPx: this.x1.coord.yPx }
      this.y2.coord = { xPx: this.y1.coord.xPx, yPx: coord.yPx }
      return
    }

    //INFO: a, bのどちらでもない場合は定義すべき軸のみ定義する
    this.nextAxis.coord = coord
  }

  inactivateAxis() {
    this.activeAxisName = ''
  }

  setX1Value(value: number): void {
    this.x1.value = value
  }

  setX2Value(value: number): void {
    this.x2.value = value
  }

  setY1Value(value: number): void {
    this.y1.value = value
  }

  setY2Value(value: number): void {
    this.y2.value = value
  }

  setXIsLog(value: boolean): void {
    this.xIsLog = value
  }

  setYIsLog(value: boolean): void {
    this.yIsLog = value
  }
}
