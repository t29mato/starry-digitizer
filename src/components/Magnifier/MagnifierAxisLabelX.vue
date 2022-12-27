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
import Vue from 'vue'
export default Vue.extend({
  props: {
    label: String,
  },
})
</script>
