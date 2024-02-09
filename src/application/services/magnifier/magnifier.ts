import { MagnifierInterface } from './magnifierInterface'

export class Magnifier implements MagnifierInterface {
  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 300

  private static instance: MagnifierInterface

  private constructor() {}

  static getInstance(): MagnifierInterface {
    if (!this.instance) {
      this.instance = new Magnifier()
    }

    return this.instance
  }

  setScale(scale: number) {
    this.scale = scale
  }
}
