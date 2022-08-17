<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((yPx - axisHalfSizePx) / canvas.scale) * magnifier.scale}px`,
        left: `${
          ((xPx - axisCrossBorderHalfPx) / canvas.scale) * magnifier.scale
        }px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvas.cursor.xPx - magnifierHalfSizePx / magnifier.scale
        }px, -${canvas.cursor.yPx - magnifierHalfSizePx / magnifier.scale}px)`,
        'transform-origin': 'top left',
        width: `${axisCrossBorderPx / canvas.scale}px`,
        height: `${axisSizePx / canvas.scale}px`,
        background: isActive ? 'red' : 'dodgerblue',
      }"
    >
      <div
        :style="{
          content: '',
          position: 'absolute',
          top: `${axisCrossTopPx / canvas.scale}px`,
          left: `${-(axisCrossTopPx / canvas.scale)}px`,
          width: `${axisSizePx / canvas.scale}px`,
          height: `${axisCrossBorderPx / canvas.scale}px`,
          background: isActive ? 'red' : 'dodgerblue',
        }"
      ></div>
    </div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((yPx - axisCrossCursorPx) / canvas.scale) * magnifier.scale
        }px`,
        left: `${
          ((xPx + axisCrossCursorPx) / canvas.scale) * magnifier.scale
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
import { Position } from '@/domains/datasetInterface'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { styleMapper } from '@/store/modules/style'
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {}
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    ...styleMapper.mapGetters([
      'axisSizePx',
      'axisHalfSizePx',
      'axisCrossBorderHalfPx',
      'axisCrossBorderPx',
      'axisCrossTopPx',
      'axisCrossCursorPx',
    ]),
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
