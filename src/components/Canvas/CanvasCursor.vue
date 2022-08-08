<template>
  <div
    :style="{
      position: 'absolute',
      top: `${canvas.scaledCursor.yPx - 12}px`,
      left: `${canvas.scaledCursor.xPx + 7}px`,
      'pointer-events': 'none',
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import Vue from 'vue'
export default Vue.extend({
  props: {},
  computed: {
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
