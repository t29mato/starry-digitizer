<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: `${((yPx - plotHalfSize) / canvasScale) * magnifierScale}px`,
      left: `${((xPx - plotHalfSize) / canvasScale) * magnifierScale}px`,
      transform: `scale(${magnifierScale}) translate(-${
        cursor.xPx / canvasScale - magnifierHalfSize / magnifierScale
      }px, -${
        cursor.yPx / canvasScale - magnifierHalfSize / magnifierScale
      }px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      width: `${plotSize / canvasScale}px`,
      height: `${plotSize / canvasScale}px`,
      'background-color': isActive ? 'red' : 'dodgerblue',
      outline: `${1 / canvasScale}px solid white`,
      'border-radius': '50%',
    }"
  ></div>
</template>

<script lang="ts">
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    plotHalfSize(): number {
      return this.plotSize / 2
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
  },
  props: {
    plot: {
      type: Object as () => Position,
      required: true,
    },
    plotSize: {
      type: Number,
      required: true,
    },
    canvasScale: {
      type: Number,
      required: true,
    },
    cursor: {
      // REFACTOR: Position typeを利用する
      type: Object as () => {
        xPx: Number
        yPx: Number
      },
      required: true,
    },
    magnifierScale: {
      type: Number,
      required: true,
    },
    magnifierSize: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
  },
})
</script>
