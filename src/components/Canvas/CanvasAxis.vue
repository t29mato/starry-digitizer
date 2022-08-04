<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${yPx - axes.halfSizePx}px`,
        left: `${xPx - axes.halfSizePx}px`,
        'pointer-events': 'none',
        width: `${axes.sizePx}px`,
        height: `${axes.sizePx}px`,
        'border-radius': '50%',
        'background-color': isActive ? 'red' : 'dodgerblue',
        outline: `1px solid white`,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${yPx - axes.halfSizePx - 9}px`,
        left: `${xPx - axes.halfSizePx + 12}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ label }}</span
    >
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvasScale']),
    xPx(): number {
      return this.axis.xPx * this.canvasScale
    },
    yPx(): number {
      return this.axis.yPx * this.canvasScale
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
