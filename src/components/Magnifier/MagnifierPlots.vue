<template>
  <!-- INFO: プロットデータ -->
  <div
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
      width: `${plotSize / canvasScale}px`,
      height: `${plotSize / canvasScale}px`,
      'background-color': 'white',
      outline: isActive
        ? `${1 / canvasScale}px solid red`
        : `${1 / canvasScale}px solid green`,
      'border-radius': '50%',
    }"
  ></div>
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
    isActive: {
      type: Boolean,
    },
  },
})
</script>
