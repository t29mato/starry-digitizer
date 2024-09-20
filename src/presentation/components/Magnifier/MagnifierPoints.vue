<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-points"
    :style="{
      position: 'absolute',
      top: top,
      left: left,
      transform: `scale(${magnifier.scale}) translate(-${
        canvasHandler.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${
        canvasHandler.cursor.yPx - magnifierHalfSize / magnifier.scale
      }px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      width: size,
      height: size,
      'background-color': backgroundColor,
      border: `${1}px solid white`,
      'border-radius': borderRadius,
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
      zIndex: zIndex,
    }"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Coord } from '@/@types/types'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { magnifier } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { STYLE } from '@/constants'

export default defineComponent({
  data() {
    return {
      interpolator,
      magnifier,
      canvasHandler,
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

      return '#1e90ff'
    },
    borderRadius(): string {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にpointで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    size(): string {
      if (this.isTemporary) {
        return this.tempPointSizePx + 'px'
      }

      return this.pointSizePx + 'px'
    },
    top(): string {
      if (this.isTemporary) {
        return (
          (this.yPx - this.tempPointSizePx / 2) * this.magnifier.scale + 'px'
        )
      }

      return (this.yPx - this.pointSizePx / 2) * this.magnifier.scale + 'px'
    },
    left(): string {
      if (this.isTemporary) {
        return (
          (this.xPx - this.tempPointSizePx / 2) * this.magnifier.scale + 'px'
        )
      }

      return (this.xPx - this.pointSizePx / 2) * this.magnifier.scale + 'px'
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
  },
})
</script>
