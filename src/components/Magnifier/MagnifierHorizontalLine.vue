<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${magnifierSize}px`,
      height: `${magnifierSize / 2}px`,
      'border-bottom': '1px solid grey',
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
