<template>
  <div>
    <img
      :src="canvas.uploadImageUrl"
      alt="the image you uploaded"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `scale(${magnifier.scale}) translate(-${
          canvas.cursor.xPx - halfSize / magnifier.scale
        }px, -${canvas.cursor.yPx - halfSize / magnifier.scale}px)`,
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
          this.magnifier.scale / this.canvas.scale
        }) translate(-${
          (canvas.cursor.xPx - halfSize / magnifier.scale) * canvas.scale
        }px, -${
          (canvas.cursor.yPx - halfSize / magnifier.scale) * canvas.scale
        }px)`,
        'transform-origin': 'top left',
      }"
    ></canvas>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'

export default Vue.extend({
  computed: {
    ...mapGetters('magnifier', { magnifier: 'magnifier' }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
    halfSize(): number {
      return this.magnifier.sizePx / 2
    },
  },
  props: {},
})
</script>
