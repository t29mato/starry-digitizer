<template>
  <div
    :style="{
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: `${magnifierSize}px`,
      height: `${height}px`,
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
    crosshairSizePx: {
      type: Number,
      required: true,
    },
  },
  computed: {
    // INFO: 十字線を作成する箱の横幅
    height(): number {
      return (this.magnifierSize - this.crosshairSizePx) / 2
    },
  },
})
</script>
