<template>
  <div>
    <canvas
      id="magnifierMaskCanvas"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
        transform: `scale(${
          this.magnifierScale / this.canvasScale
        }) translate(-${
          (cursorX - halfSize / magnifierScale) * canvasScale
        }px, -${(cursorY - halfSize / magnifierScale) * canvasScale}px)`,
        'transform-origin': 'top left',
        'z-index': 100,
      }"
    ></canvas>
    <img
      :src="src"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `scale(${magnifierScale}) translate(-${
          cursorX - halfSize / magnifierScale
        }px, -${cursorY - halfSize / magnifierScale}px)`,
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
    magnifierScale: {
      type: Number,
      required: true,
    },
    canvasScale: {
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
