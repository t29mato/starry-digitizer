<template>
  <div>
    <img
      :src="canvasHandler.uploadImageUrl"
      alt="the image you uploaded"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `scale(${magnifier.scale}) translate(-${
          canvasHandler.cursor.xPx - halfSize / magnifier.scale
        }px, -${canvasHandler.cursor.yPx - halfSize / magnifier.scale}px)`,
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
          magnifier.scale / canvasHandler.scale
        }) translate(-${
          (canvasHandler.cursor.xPx - halfSize / magnifier.scale) *
          canvasHandler.scale
        }px, -${
          (canvasHandler.cursor.yPx - halfSize / magnifier.scale) *
          canvasHandler.scale
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
        transform: `scale(${
          magnifier.scale / canvasHandler.scale
        }) translate(-${
          (canvasHandler.cursor.xPx - halfSize / magnifier.scale) *
          canvasHandler.scale
        }px, -${
          (canvasHandler.cursor.yPx - halfSize / magnifier.scale) *
          canvasHandler.scale
        }px)`,
        'transform-origin': 'top left',
      }"
    ></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/application/digitizerContext'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'

export default defineComponent({
  setup() {
    const { interpolator, magnifier, canvasHandler } = useDigitizerContext()
    return { interpolator, magnifier, canvasHandler }
  },
  mounted() {
    this.interpolator.setMagnifierCanvas(
      new HTMLCanvas('magnifierInterpolationCanvas'),
    )
  },
  computed: {
    halfSize(): number {
      return this.magnifier.sizePx / 2
    },
  },
})
</script>
