import { MagnifierInterface } from './magnifierInterface'

export class Magnifier implements MagnifierInterface {
  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 300

  setScale(scale: number) {
    this.scale = scale
  }
}
