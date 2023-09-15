<template>
  <div
    :style="{
      position: 'absolute',
      left: `${-18}px`,
      top: `${-10}px`,
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  props: {
    label: String,
  },
})
</script>
