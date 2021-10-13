<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${magnifierSize / 2 - magicNumberPx}px`,
      height: `${magnifierSize}px`,
      'border-right': '1px solid grey',
    }"
  ></div>
</template>

<script lang="ts">
const magicNumberPx = 3
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      magicNumberPx,
    }
  },
  props: {
    magnifierSize: {
      type: Number,
      required: true,
    },
  },
})
</script>
