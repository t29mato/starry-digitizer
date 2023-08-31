<template>
  <div
    :style="{
      position: 'absolute',
      left: `${4}px`,
      top: `${8}px`,
    }"
  >
    {{ label }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: {
    label: String,
  },
})
</script>
