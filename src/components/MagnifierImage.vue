<template>
  <img
    :src="src"
    :style="{
      transform: `scale(${scale}) translate(-${
        cursorX - size / 2 / scale
      }px, -${cursorY - size / 2 / scale}px)`,
      'transform-origin': 'top left',
    }"
  />
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    src: {
      type: String,
      required: true,
    },
    scale: {
      type: Number,
      required: true,
    },
    cursorX: {
      type: Number,
      required: true,
    },
    cursorY: {
      type: Number,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
})
</script>
