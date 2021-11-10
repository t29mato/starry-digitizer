<template>
  <!-- INFO: プロットデータ -->
  <canvas
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: `${((plot.yPx - plotHalfSize) / canvasScale) * magnifierScale}px`,
      left: `${((plot.xPx - plotHalfSize) / canvasScale) * magnifierScale}px`,
      transform: `scale(${magnifierScale}) translate(-${
        cursor.xPx / canvasScale - magnifierHalfSize / magnifierScale
      }px, -${
        cursor.yPx / canvasScale - magnifierHalfSize / magnifierScale
      }px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      outline: '1px dotted red',
    }"
  ></canvas>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {
    plotHalfSize(): number {
      return this.plotSize / 2
    },
    magnifierHalfSize(): number {
      return this.magnifierSize / 2
    },
  },
  props: {
    plot: {
      type: Object as () => {
        xPx: Number
        yPx: Number
      },
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
  },
})
</script>
