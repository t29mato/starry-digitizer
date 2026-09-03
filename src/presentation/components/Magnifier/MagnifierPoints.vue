<template>
  <!-- INFO: プロットデータ
    2重のdivに分けている理由: 外側divは既存通りcursor追従の座標変換(scale
    + translate)を担い、内側divはそのscaleを打ち消すサイズ・オフセットを
    持つことで、拡大鏡のズーム倍率(magnifier.scale)に依存しない見た目の
    マーカーサイズ(effectiveMarkerSizePx)を実現している。#12: 密集した点の
    マーカー同士が拡大鏡のズームに比例して肥大化し、視認性が下がる問題への対応。
  -->
  <div
    :style="{
      position: 'absolute',
      top: `${yPx * magnifier.scale}px`,
      left: `${xPx * magnifier.scale}px`,
      transform: `scale(${magnifier.scale}) translate(-${
        canvasHandler.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${
        canvasHandler.cursor.yPx - magnifierHalfSize / magnifier.scale
      }px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
    }"
  >
    <div
      class="magnifier-points"
      :style="{
        position: 'absolute',
        top: innerOffset,
        left: innerOffset,
        width: innerSize,
        height: innerSize,
        'background-color': backgroundColor,
        // INFO: 白一色の縁取りだと明るい背景(白背景や、今回のようなマスクの
        // ハイライト色)で見えなくなるため、白+黒の二重リングにする。外側divに
        // scale(magnifier.scale)がかかっているため、リング自体の見た目の太さも
        // scaleに依存してしまわないよう innerBoxShadow 側で 1/scale している。
        'box-shadow': innerBoxShadow,
        'border-radius': borderRadius,
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: opacity,
        zIndex: zIndex,
      }"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Coord } from '@/@types/types'

import { useDigitizerContext } from '@/application/digitizerContext'
import { STYLE } from '@/constants'

export default defineComponent({
  setup() {
    const { interpolator, magnifier, canvasHandler } = useDigitizerContext()
    return { interpolator, magnifier, canvasHandler }
  },
  data() {
    return {
      pointSizePx: STYLE.POINT_SIZE_PX,
      pointOpacity: STYLE.POINT_OPACITY,
      tempPointOpacity: STYLE.TEMP_POINT_OPACITY,
      tempPointSizePx: STYLE.TEMP_POINT_SIZE_PX,
    }
  },
  computed: {
    pointHalfSize(): number {
      return this.pointSizePx / 2
    },
    magnifierHalfSize(): number {
      return this.magnifierSize / 2
    },
    xPx(): number {
      return this.point.xPx
    },
    yPx(): number {
      return this.point.yPx
    },
    opacity() {
      return this.isTemporary ? this.tempPointOpacity : this.pointOpacity
    },
    backgroundColor() {
      if (this.isActive) {
        return '#ff0000'
      }

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '#6a5acd'
      }

      if (this.datasetColor) {
        return this.datasetColor
      }

      return '#1e90ff'
    },
    borderRadius(): string {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にpointで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    // INFO: 拡大鏡内でのマーカー表示サイズ。magnifier.markerSizePx(通常点の
    // 設定値)を基準に、一時点は本体キャンバスでの比率(tempPointSizePx /
    // pointSizePx)を保ったまま縮小する。
    effectiveMarkerSizePx(): number {
      if (this.isTemporary) {
        return (
          (this.magnifier.markerSizePx * this.tempPointSizePx) /
          this.pointSizePx
        )
      }

      return this.magnifier.markerSizePx
    },
    // INFO: 外側divには既に magnifier.scale の transform がかかっているため、
    // 内側divのサイズ・オフセットをあらかじめ 1/scale しておくことで、
    // 最終的な見た目のサイズが scale に依存しない effectiveMarkerSizePx になる。
    innerSize(): string {
      return this.effectiveMarkerSizePx / this.magnifier.scale + 'px'
    },
    innerOffset(): string {
      return -this.effectiveMarkerSizePx / 2 / this.magnifier.scale + 'px'
    },
    innerBoxShadow(): string {
      const whiteRingPx = 1 / this.magnifier.scale
      const blackRingPx = 2 / this.magnifier.scale
      return `0 0 0 ${whiteRingPx}px white, 0 0 0 ${blackRingPx}px black`
    },
    zIndex(): string {
      if (this.isTemporary) {
        return '1'
      }

      return '2'
    },
  },
  props: {
    point: {
      type: Object as () => Coord,
      required: true,
    },
    magnifierSize: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
    isVisible: {
      type: Boolean,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    isManuallyAdded: {
      type: Boolean,
      default: false,
    },
    datasetColor: {
      type: String,
      default: undefined,
    },
  },
})
</script>
