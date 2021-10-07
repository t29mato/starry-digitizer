<template>
  <div>
    <img
      :src="src"
      :style="{
        transform: `scale(${scale}) translate(-${
          cursorX - halfSize / scale
        }px, -${cursorY - halfSize / scale}px)`,
        'transform-origin': 'top left',
      }"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {
    halfSize(): number {
      return this.size / 2
    },
  },
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
