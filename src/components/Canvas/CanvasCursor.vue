<template>
  <div
    :style="{
      position: 'absolute',
      top: `${canvas.scaledCursor.yPx - 12}px`,
      left: `${canvas.scaledCursor.xPx + 7}px`,
      'pointer-events': 'none',
    }"
  >
    <div v-if="shouldShowLabel">
      {{ label }}
    </div>
  </div>
</template>

<script lang="ts">
import { canvasMapper } from '@/store/modules/canvas'
import Vue from 'vue'
export default Vue.extend({
  props: {
    label: {
      type: String,
      required: true,
    },
    shouldShowLabel: {
      type: Boolean,
      required: true,
    },
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
  },
})
</script>
