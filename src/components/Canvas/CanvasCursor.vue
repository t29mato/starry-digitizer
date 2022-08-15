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
      return this.axes.nextAxisKey
    },
  },
})
</script>
