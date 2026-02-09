import { MagnifierInterface } from './magnifierInterface'

export class Magnifier implements MagnifierInterface {
  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 300
  effectiveDigits = 4

  setScale(scale: number) {
    this.scale = scale
  }

  setEffectiveDigits(digits: number) {
    this.effectiveDigits = digits
  }
}
