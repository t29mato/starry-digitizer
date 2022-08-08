<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((yPx - axes.halfSizePx) / canvas.scale) * magnifier.scale}px`,
        left: `${((xPx - axes.halfSizePx) / canvas.scale) * magnifier.scale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvas.cursor.xPx - magnifierHalfSizePx / magnifier.scale
        }px, -${canvas.cursor.yPx - magnifierHalfSizePx / magnifier.scale}px)`,
        'transform-origin': 'top left',
        width: `${axes.sizePx / canvas.scale}px`,
        height: `${axes.sizePx / canvas.scale}px`,
        'border-radius': '50%',
        'background-color': isActive ? 'red' : 'dodgerblue',
        outline: `${1 / canvas.scale}px solid white`,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((yPx - axes.halfSizePx - axes.sizePx) / canvas.scale - 3) *
          magnifier.scale
        }px`,
        left: `${
          ((xPx - axes.halfSizePx + axes.sizePx) / canvas.scale + 3) *
          magnifier.scale
        }px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvas.cursor.xPx - magnifierHalfSizePx / magnifier.scale
        }px, -${canvas.cursor.yPx - magnifierHalfSizePx / magnifier.scale}px)`,
        'transform-origin': 'top left',
      }"
      >{{ label }}</span
    >
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      hoge: '',
    }
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    ...magnifierMapper.mapGetters(['magnifier']),
    xPx(): number {
      return this.axis.xPx * this.canvas.scale
    },
    yPx(): number {
      return this.axis.yPx * this.canvas.scale
    },
    magnifierHalfSizePx(): number {
      return this.magnifier.sizePx / 2
    },
  },
  props: {
    axis: {
      type: Object as () => Position,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
  },
  methods: {},
})
</script>
