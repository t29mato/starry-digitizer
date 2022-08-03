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
      >{{ showAxisName }}</span
    >
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...axesMapper.mapGetters(['axes']),
    showAxisName(): string {
      switch (this.index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          throw new Error('Maximum count of axes is 4')
      }
    },
    xPx(): number {
      return this.axis.xPx
    },
    yPx(): number {
      return this.axis.yPx
    },
  },
  props: {
    axis: {
      type: Object as () => Position,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
})
</script>
