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
        transform: `scale(${magnifier.scale / canvas.scale}) translate(-${
          (canvas.cursor.xPx - halfSize / magnifier.scale) * canvas.scale
        }px, -${
          (canvas.cursor.yPx - halfSize / magnifier.scale) * canvas.scale
        }px)`,
        'transform-origin': 'top left',
      }"
    ></canvas>
    <canvas
      id="magnifierInterpolationCanvas"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
        transform: `scale(${magnifier.scale / canvas.scale}) translate(-${
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
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { mapState } from 'pinia'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { Magnifier } from '@/application/services/magnifier/magnifier'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      magnifier: Magnifier.getInstance(),
    }
  },
  mounted() {
    this.interpolator.setMagnifierCanvas(
      new HTMLCanvas('magnifierInterpolationCanvas'),
    )
  },
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
    halfSize(): number {
      return this.magnifier.sizePx / 2
    },
  },
})
</script>
