import { Datasets, Dataset } from '@/types'

type Axis = {
  xPx: number
  yPx: number
  value: number
}

type Axes = {
  x1: Axis
  x2: Axis
  y1: Axis
  y2: Axis
}

export class AxesManager {
  // TODO: x1, x2, y1, y2はそれぞれプロパティとして分ける？
  axes: Axes = {
    x1: {
      xPx: -999,
      yPx: -999,
      value: 0,
    },
    x2: {
      xPx: -999,
      yPx: -999,
      value: 1,
    },
    y1: {
      xPx: -999,
      yPx: -999,
      value: 0,
    },
    y2: {
      xPx: -999,
      yPx: -999,
      value: 1,
    },
  }
  axesValuesErrorMessage = ''
  xIsLog = false
  yIsLog = false

  static #instance: AxesManager
  static get instance(): AxesManager {
    if (!this.#instance) {
      this.#instance = new AxesManager()
    }
    return this.#instance
  }

  get nextAxis() {
    if (this.axes.x1.xPx + this.axes.x1.yPx < 0) {
      return this.axes.x1
    }
    if (this.axes.x2.xPx + this.axes.x2.yPx < 0) {
      return this.axes.x2
    }
    if (this.axes.y1.xPx + this.axes.y1.yPx < 0) {
      return this.axes.y1
    }
    if (this.axes.y2.xPx + this.axes.y2.yPx < 0) {
      return this.axes.y2
    }
    return null
  }

  get axesPos() {
    return [
      {
        xPx: this.axes.x1.xPx,
        yPx: this.axes.x1.yPx,
      },
      {
        xPx: this.axes.x2.xPx,
        yPx: this.axes.x2.yPx,
      },
      {
        xPx: this.axes.y1.xPx,
        yPx: this.axes.y1.yPx,
      },
      {
        xPx: this.axes.y2.xPx,
        yPx: this.axes.y2.yPx,
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

  // get axesValues() {
  //   return [
  //     this.axes.x1.value,
  //     this.axes.x2.value,
  //     this.axes.y1.value,
  //     this.axes.y2.value,
  //   ]
  // }

  validateAxes(): boolean {
    if (this.axes.x1.value === this.axes.x2.value) {
      this.axesValuesErrorMessage = 'x1 and x2 should not be same value'
      return false
    }
    if (this.axes.y1.value === this.axes.y2.value) {
      this.axesValuesErrorMessage = 'y1 and y2 should not be same value'
      return false
    }
    // if (Object.values(this.axesValues).includes()) {
    //   this.axesValuesErrorMessage = 'axes values should not be empty'
    //   return false
    // }
    this.axesValuesErrorMessage = ''
    return true
    // return this.axesPos.length === 4
  }
}
