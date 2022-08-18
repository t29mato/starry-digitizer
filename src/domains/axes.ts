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
  activeIndex = -1
  nextIndex = 0

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

  get isActive() {
    return this.activeIndex >= 0
  }

  get hasNext() {
    return this.nextIndex >= 0
  }

  get exist() {
    if (
      this.x1.xPx >= 0 ||
      this.x2.xPx >= 0 ||
      this.y1.xPx >= 0 ||
      this.y2.xPx >= 0
    ) {
      return true
    }
    return false
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
    switch (this.activeIndex) {
      case 0:
        return this.x1
      case 1:
        return this.x2
      case 2:
        return this.y1
      case 3:
        return this.y2
    }
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
      case 'ArrowRight':
        this.activeAxis.xPx++
        break
      case 'ArrowDown':
        this.activeAxis.yPx++
        break
      case 'ArrowLeft':
        this.activeAxis.xPx--
        break
      default:
        break
    }
  }

  clearAxes() {
    this.x1 = {
      xPx: -999,
      yPx: -999,
      value: 0,
    }
    this.x2 = {
      xPx: -999,
      yPx: -999,
      value: 1,
    }
    this.y1 = {
      xPx: -999,
      yPx: -999,
      value: 0,
    }
    this.y2 = {
      xPx: -999,
      yPx: -999,
      value: 1,
    }
    this.activeIndex = -1
    this.nextIndex = 0
  }

  addAxisPosition(xPx: number, yPx: number) {
    if (!this.nextAxis) {
      throw new Error('The axes already filled.')
    }
    this.nextAxis.xPx = xPx
    this.nextAxis.yPx = yPx
    this.activeIndex++
    this.nextIndex++
    if (this.nextIndex === 4) {
      this.nextIndex = -1
    }
  }

  inactivateAxis() {
    this.activeIndex = -1
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
    this.error = ''
    return true
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
