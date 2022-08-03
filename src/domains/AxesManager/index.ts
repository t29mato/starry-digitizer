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

  static #instance: Axes
  static get instance(): Axes {
    if (!this.#instance) {
      this.#instance = new Axes()
    }
    return this.#instance
  }

  get nextAxis() {
    if (this.x1.xPx + this.x1.yPx < 0) {
      return this.x1
    }
    if (this.x2.xPx + this.x2.yPx < 0) {
      return this.x2
    }
    if (this.y1.xPx + this.y1.yPx < 0) {
      return this.y1
    }
    if (this.y2.xPx + this.y2.yPx < 0) {
      return this.y2
    }
    return null
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

  addAxisPosition(xPx: number, yPx: number) {
    if (!this.nextAxis) {
      throw new Error('The axes already filled.')
    }
    this.nextAxis.xPx = xPx
    this.nextAxis.yPx = yPx
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
