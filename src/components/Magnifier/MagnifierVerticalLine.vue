<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${magnifierSize / 2}px`,
      height: `${magnifierSize}px`,
      'border-right': '1px solid grey',
    }"
  ></div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    magnifierSize: {
      type: Number,
      required: true,
    },
  },
})
</script>
