<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: top,
      left: left,
      transform: `scale(${magnifier.scale}) translate(-${
        canvas.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${canvas.cursor.yPx - magnifierHalfSize / magnifier.scale}px)`,
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

import { Coord } from '@/domain/datasetInterface'

import { useCanvasStore } from '@/store/canvas'
import { useStyleStore } from '@/store/style'
import { useMagnifierStore } from '@/store/magnifier'
import { mapState } from 'pinia'
import { Interpolator } from '@/application/services/interpolator'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
    }
  },
  computed: {
    ...mapState(useMagnifierStore, ['magnifier']),
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useStyleStore, ['plotSizePx']),
    ...mapState(useStyleStore, [
      'plotOpacity',
      'tempPlotOpacity',
      'plotSizePx',
      'tempPlotSizePx',
    ]),
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
    magnifierHalfSize(): number {
      return this.magnifierSize / 2
    },
    xPx(): number {
      return this.plot.xPx
    },
    yPx(): number {
      return this.plot.yPx
    },
    opacity() {
      return this.isTemporary ? this.tempPlotOpacity : this.plotOpacity
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
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にplotで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    size(): string {
      if (this.isTemporary) {
        return this.tempPlotSizePx + 'px'
      }

      return this.plotSizePx + 'px'
    },
    top(): string {
      if (this.isTemporary) {
        return (
          (this.yPx - this.tempPlotSizePx / 2) * this.magnifier.scale + 'px'
        )
      }

      return (this.yPx - this.plotSizePx / 2) * this.magnifier.scale + 'px'
    },
    left(): string {
      if (this.isTemporary) {
        return (
          (this.xPx - this.tempPlotSizePx / 2) * this.magnifier.scale + 'px'
        )
      }

      return (this.xPx - this.plotSizePx / 2) * this.magnifier.scale + 'px'
    },
    zIndex(): string {
      if (this.isTemporary) {
        return '1'
      }

      return '2'
    },
  },
  props: {
    plot: {
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
