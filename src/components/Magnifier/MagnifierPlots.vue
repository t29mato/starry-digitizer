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
      'background-color': isActive ? 'red' : 'dodgerblue',
      border: `${1}px solid white`,
      'border-radius': '50%',
    }"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";


import { Coord } from '@/domains/datasetInterface'
export default defineComponent({
  computed: {
    ...mapGetters('magnifier', { magnifier: 'magnifier' }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
    ...mapGetters('style', { plotSizePx: 'plotSizePx' }),
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
  },
})
</script>
