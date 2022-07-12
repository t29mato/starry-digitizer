<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${yPx - axesHalfSize}px`,
        left: `${xPx - axesHalfSize}px`,
        'pointer-events': 'none',
        width: `${axesSize}px`,
        height: `${axesSize}px`,
        'border-radius': '50%',
        'background-color': color,
        outline: '1px solid white',
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${yPx - axesHalfSize - 9}px`,
        left: `${xPx - axesHalfSize + 12}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ showAxisName }}</span
    >
  </div>
</template>

<script lang="ts">
import { Position } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    axesHalfSize(): number {
      return this.axesSize / 2
    },
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
    color: {
      type: String,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    axesSize: {
      type: Number,
      required: true,
    },
    isFit: {
      type: Boolean,
    },
  },
})
</script>
