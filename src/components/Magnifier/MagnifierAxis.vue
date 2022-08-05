<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((yPx - axes.halfSizePx) / canvasScale) * magnifier.scale}px`,
        left: `${((xPx - axes.halfSizePx) / canvasScale) * magnifier.scale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierHalfSizePx / magnifier.scale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierHalfSizePx / magnifier.scale
        }px)`,
        'transform-origin': 'top left',
        width: `${axes.sizePx / canvasScale}px`,
        height: `${axes.sizePx / canvasScale}px`,
        'border-radius': '50%',
        'background-color': isActive ? 'red' : 'dodgerblue',
        outline: `${1 / canvasScale}px solid white`,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((yPx - axes.halfSizePx - axes.sizePx) / canvasScale - 3) *
          magnifier.scale
        }px`,
        left: `${
          ((xPx - axes.halfSizePx + axes.sizePx) / canvasScale + 3) *
          magnifier.scale
        }px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierHalfSizePx / magnifier.scale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierHalfSizePx / magnifier.scale
        }px)`,
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
import Vue, { PropType } from 'vue'
export default Vue.extend({
  data() {
    return {
      hoge: '',
    }
  },
  computed: {
    ...canvasMapper.mapGetters(['canvasScale']),
    ...axesMapper.mapGetters(['axes']),
    ...magnifierMapper.mapGetters(['magnifier']),
    xPx(): number {
      return this.axis.xPx * this.canvasScale
    },
    yPx(): number {
      return this.axis.yPx * this.canvasScale
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
    canvasCursor: {
      type: Object as PropType<{
        xPx: number
        yPx: number
      }>,
      required: true,
    },
  },
  methods: {
    hogehoge(): void {
      this.hoge = 'hoge'
    },
  },
})
</script>
