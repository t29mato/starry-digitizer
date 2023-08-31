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
import Vue from 'vue'
export default Vue.extend({
  props: {
    label: String,
  },
})
</script>
