import { MagnifierInterface } from './magnifierInterface'
import { STYLE } from '@/constants'

export class Magnifier implements MagnifierInterface {
  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 300
  effectiveDigits = 4
  // INFO: 拡大鏡内でのマーカー表示サイズ。scale(拡大鏡のズーム倍率)とは独立に
  // 設定できるようにすることで、密集した点のマーカー同士が拡大に比例して
  // 肥大化し、視認性が下がる問題(#12)を緩和する。
  markerSizePx: number = STYLE.POINT_SIZE_PX

  setScale(scale: number) {
    this.scale = scale
  }

  setEffectiveDigits(digits: number) {
    this.effectiveDigits = digits
  }

  setMarkerSizePx(sizePx: number) {
    this.markerSizePx = sizePx
  }
}
