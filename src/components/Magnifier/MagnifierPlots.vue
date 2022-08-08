<template>
  <!-- INFO: プロットデータ -->
  <div
    class="magnifier-plots"
    :style="{
      position: 'absolute',
      top: `${((yPx - plotHalfSize) / canvas.scale) * magnifier.scale}px`,
      left: `${((xPx - plotHalfSize) / canvas.scale) * magnifier.scale}px`,
      transform: `scale(${magnifier.scale}) translate(-${
        canvas.cursor.xPx - magnifierHalfSize / magnifier.scale
      }px, -${canvas.cursor.yPx - magnifierHalfSize / magnifier.scale}px)`,
      'transform-origin': 'top left',
      'pointer-events': 'none',
      width: `${canvas.plotSizePx / canvas.scale}px`,
      height: `${canvas.plotSizePx / canvas.scale}px`,
      'background-color': isActive ? 'red' : 'dodgerblue',
      outline: `${1 / canvas.scale}px solid white`,
      'border-radius': '50%',
    }"
  ></div>
</template>

<script lang="ts">
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...magnifierMapper.mapGetters(['magnifier']),
    ...canvasMapper.mapGetters(['canvas']),
    plotHalfSize(): number {
      return this.canvas.plotSizePx / 2
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
