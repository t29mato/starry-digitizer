<template>
  <div>
    <!-- INFO: 端付近ではtranslate値が負になるため、`-${...}` 形式だと
         `--Npx` という不正なCSSになりMagnifierが固まる (#255) -->
    <img
      :src="canvasHandler.uploadImageUrl"
      alt="the image you uploaded"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `scale(${magnifier.scale}) translate(${
          halfSize / magnifier.scale - canvasHandler.cursor.xPx
        }px, ${halfSize / magnifier.scale - canvasHandler.cursor.yPx}px)`,
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
        transform: `scale(${magnifier.scale / canvasHandler.scale}) translate(${
          (halfSize / magnifier.scale - canvasHandler.cursor.xPx) *
          canvasHandler.scale
        }px, ${
          (halfSize / magnifier.scale - canvasHandler.cursor.yPx) *
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
        transform: `scale(${magnifier.scale / canvasHandler.scale}) translate(${
          (halfSize / magnifier.scale - canvasHandler.cursor.xPx) *
          canvasHandler.scale
        }px, ${
          (halfSize / magnifier.scale - canvasHandler.cursor.yPx) *
          canvasHandler.scale
        }px)`,
        'transform-origin': 'top left',
      }"
    ></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { magnifier } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'

export default defineComponent({
  data() {
    return {
      interpolator,
      magnifier,
      canvasHandler,
    }
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
