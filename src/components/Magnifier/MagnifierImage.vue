<template>
  <div>
    <img
      :src="src"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `scale(${magnifier.scale}) translate(-${
          cursorX - halfSize / magnifier.scale
        }px, -${cursorY - halfSize / magnifier.scale}px)`,
        'transform-origin': 'top left',
      }"
    />
    <canvas
      id="magnifierMaskCanvas"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
        transform: `scale(${
          this.magnifier.scale / this.canvasScale
        }) translate(-${
          (cursorX - halfSize / magnifier.scale) * canvasScale
        }px, -${(cursorY - halfSize / magnifier.scale) * canvasScale}px)`,
        'transform-origin': 'top left',
      }"
    ></canvas>
  </div>
</template>

<script lang="ts">
import { magnifierMapper } from '@/store/modules/magnifier'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...magnifierMapper.mapGetters(['magnifier']),
    halfSize(): number {
      return this.magnifier.sizePx / 2
    },
  },
  props: {
    src: {
      type: String,
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
  },
})
</script>
