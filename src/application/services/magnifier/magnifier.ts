import { MagnifierInterface } from './magnifierInterface'
import { STYLE } from '@/constants'

export class Magnifier implements MagnifierInterface {
  scale = 5
  magnifierSettingError = ''
  crosshairSizePx = 1
  sizePx = 300
  // INFO: 拡大鏡内でのマーカー表示サイズ。scale(拡大鏡のズーム倍率)とは独立に
  // 設定できるようにすることで、密集した点のマーカー同士が拡大に比例して
  // 肥大化し、視認性が下がる問題(#12)を緩和する。
  markerSizePx: number = STYLE.POINT_SIZE_PX

  setScale(scale: number) {
    this.scale = scale
  }

  setMarkerSizePx(sizePx: number) {
    this.markerSizePx = sizePx
  }

  // INFO: the magnifier box is square and its size is used for canvas
  // geometry and overlay math, not just CSS — so it has to live here rather
  // than being a pure stylesheet value. MagnifierMain keeps it in step with
  // the width its column actually gives it.
  setSizePx(sizePx: number) {
    this.sizePx = sizePx
  }
}
