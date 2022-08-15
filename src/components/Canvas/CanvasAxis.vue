<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${yPx - axisHalfSizePx}px`,
        left: `${xPx - axisHalfSizePx}px`,
        'pointer-events': 'none',
        width: `${axisSizePx}px`,
        height: `${axisSizePx}px`,
        'border-radius': '50%',
        'background-color': isActive ? 'red' : 'dodgerblue',
        outline: `1px solid white`,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${yPx - axisHalfSizePx - 9}px`,
        left: `${xPx - axisHalfSizePx + 12}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ label }}</span
    >
  </div>
</template>

<script lang="ts">
import { canvasMapper } from '@/store/modules/canvas'
import { styleMapper } from '@/store/modules/style'
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...styleMapper.mapGetters(['axisSizePx', 'axisHalfSizePx']),
    ...canvasMapper.mapGetters(['canvas']),
    xPx(): number {
      return this.axis.xPx * this.canvas.scale
    },
    yPx(): number {
      return this.axis.yPx * this.canvas.scale
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
  methods: {
    showLabel(index: number) {
      switch (index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          return ''
      }
    },
  },
})
</script>
