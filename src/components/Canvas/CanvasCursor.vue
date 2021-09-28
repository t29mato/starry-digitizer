<template>
  <div
    :style="{
      position: 'absolute',
      top: `${cursor.yPx - 12}px`,
      left: `${cursor.xPx + 7}px`,
      'pointer-events': 'none',
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    cursor: {
      type: Object as () => {
        xPx: Number
        yPx: Number
      },
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
})
</script>
