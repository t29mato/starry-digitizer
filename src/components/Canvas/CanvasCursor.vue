<template>
  <div
    :style="{
      position: 'absolute',
      top: `${canvas.scaledCursor.yPx - axisCrossCursorPx}px`,
      left: `${canvas.scaledCursor.xPx + axisCrossCursorPx}px`,
      'pointer-events': 'none',
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { styleMapper } from '@/store/modules/style'
import Vue from 'vue'
export default Vue.extend({
  props: {},
  computed: {
    ...styleMapper.mapGetters(['axisCrossCursorPx']),
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    label(): string {
      switch (this.canvas.maskMode) {
        case 0:
          return 'Pen'
        case 1:
          return 'Box'
        case 2:
          return 'Eraser'
      }
      switch (this.canvas.manualMode) {
        case 0:
          return 'Add'
        case 1:
          return 'Edit'
        case 2:
          return 'Delete'
      }
      if (this.axes.nextAxis) {
        if (this.axes.nextAxis.name === 'x1' && this.axes.x1IsSameAsY1) {
          return 'x1 y1'
        }
        return this.axes.nextAxis.name
      }
      return ''
    },
  },
})
</script>
