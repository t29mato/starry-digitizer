<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: `${(yPx - plotHalfSize) * magnifier.scale}px`,
      left: `${(xPx - plotHalfSize) * magnifier.scale}px`,
      transform: `scale(${magnifier.scale}) translate(-${
        canvas.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${canvas.cursor.yPx - magnifierHalfSize / magnifier.scale}px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      width: `${plotSizePx}px`,
      height: `${plotSizePx}px`,
      'background-color': backgroundColor,
      border: `${1}px solid white`,
      'border-radius': '50%',
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
    }"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Coord } from '@/domains/datasetInterface'

import { useCanvasStore } from '@/store/canvas'
import { useStyleStore } from '@/store/style'
import { useMagnifierStore } from '@/store/magnifier'
import { mapState } from 'pinia'

export default defineComponent({
  computed: {
    ...mapState(useMagnifierStore, ['magnifier']),
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useStyleStore, ['plotSizePx']),
    ...mapState(useStyleStore, ['plotOpacity', 'tempPlotOpacity']),
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
      return '#1e90ff'
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
  },
})
</script>
