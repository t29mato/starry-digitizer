import { CanvasManager as CanvasDomain } from '@/domains/CanvasManager'
const cd = CanvasDomain.instance

export type Axis = {
  xPx: number
  yPx: number
  value: number
}

export class Axes {
  // TODO: x1, x2, y1, y2はそれぞれプロパティとして分ける。
  x1: Axis = {
    xPx: -999,
    yPx: -999,
    value: 0,
  }
  x2: Axis = {
    xPx: -999,
    yPx: -999,
    value: 1,
  }
  y1: Axis = {
    xPx: -999,
    yPx: -999,
    value: 0,
  }
  y2: Axis = {
    xPx: -999,
    yPx: -999,
    value: 1,
  }
  xIsLog = false
  yIsLog = false
  error = ''
  sizePx = 10
  activeIndex = -1

  static #instance: Axes
  static get instance(): Axes {
    if (!this.#instance) {
      this.#instance = new Axes()
    }
    return this.#instance
  }

  get halfSizePx() {
    return this.sizePx / 2
  }

  get nextAxisKey() {
    if (this.x1.xPx + this.x1.yPx < 0) {
      return 'x1'
    }
    if (this.x2.xPx + this.x2.yPx < 0) {
      return 'x2'
    }
    if (this.y1.xPx + this.y1.yPx < 0) {
      return 'y1'
    }
    if (this.y2.xPx + this.y2.yPx < 0) {
      return 'y2'
    }
    return ''
  }

  get nextAxis() {
    if (this.nextAxisKey === '') {
      return
    }
    return this[this.nextAxisKey]
  }

  get axesPos() {
    return [
      {
        xPx: this.x1.xPx,
        yPx: this.x1.yPx,
      },
      {
        xPx: this.x2.xPx,
        yPx: this.x2.yPx,
      },
      {
        xPx: this.y1.xPx,
        yPx: this.y1.yPx,
      },
      {
        xPx: this.y2.xPx,
        yPx: this.y2.yPx,
      },
    ]
  }

  get activeKey() {
    switch (this.activeIndex) {
      case 0:
        return 'x1'
      case 1:
        return 'x2'
      case 2:
        return 'y1'
      case 3:
        return 'y2'
      default:
        return ''
    }
  }

  get activeAxis() {
    return this.axesPos[this.activeIndex]
  }

  axisName(index: number) {
    switch (index) {
      case 0:
        return 'x1'
      case 1:
        return 'x2'
      case 2:
        return 'y1'
      case 3:
        return 'y2'
      default:
        return ''
    }
  }

  moveActiveAxis(arrow: string) {
    switch (arrow) {
      case 'ArrowUp':
        this.activeAxis.yPx--
        break
      case 'arrowRight':
        this.activeAxis.xPx++
        break
      case 'arrowDown':
        this.activeAxis.yPx++
        break
      case 'arrowLeft':
        this.activeAxis.xPx--
        break
      default:
        break
    }
  }

  clearAxes() {
    this.x1 = this.y1 = {
      xPx: -999,
      yPx: -999,
      value: 0,
    }
    this.x2 = this.y2 = {
      xPx: -999,
      yPx: -999,
      value: 1,
    }
    this.activeIndex = -1
  }

  addAxisPosition(xPx: number, yPx: number) {
    if (!this.nextAxis) {
      throw new Error('The axes already filled.')
    }
    this.nextAxis.xPx = xPx
    this.nextAxis.yPx = yPx
    this.activeIndex++
  }

  validateAxes(): boolean {
    if (this.x1.value === this.x2.value) {
      this.error = 'x1 and x2 should not be same value'
      return false
    }
    if (this.y1.value === this.y2.value) {
      this.error = 'y1 and y2 should not be same value'
      return false
    }
    // if (Object.values(this.axesValues).includes()) {
    //   this.error = 'axes values should not be empty'
    //   return false
    // }
    this.error = ''
    return true
    // return this.axesPos.length === 4
  }

  scaledAxes(scale: number) {
    return {
      x1: {
        xPx: this.x1.xPx * scale,
        yPx: this.x1.yPx * scale,
        value: this.x1.value,
      },
      x2: {
        xPx: this.x2.xPx * scale,
        yPx: this.x2.yPx * scale,
        value: this.x2.value,
      },
      y1: {
        xPx: this.y1.xPx * scale,
        yPx: this.y1.yPx * scale,
        value: this.y1.value,
      },
      y2: {
        xPx: this.y2.xPx * scale,
        yPx: this.y2.yPx * scale,
        value: this.y2.value,
      },
    }
  }
}
