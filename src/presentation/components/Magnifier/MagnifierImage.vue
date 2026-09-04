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
      ref="magnifierMaskCanvas"
      data-cy="magnifier-mask-canvas"
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
      ref="magnifierInterpolationCanvas"
      data-cy="magnifier-interpolation-canvas"
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

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'

export default defineComponent({
  setup() {
    const { interpolator, magnifier, canvasHandler } = useDigitizerContext()
    return { interpolator, magnifier, canvasHandler }
  },
  mounted() {
    // INFO: this component owns the magnifier canvases, so it is the one that
    // hands them to the engine (no id lookup: several digitizer instances can
    // share a page).
    this.canvasHandler.attachCanvases({
      magnifierMaskCanvas: this.$refs.magnifierMaskCanvas as HTMLCanvasElement,
    })
    this.interpolator.setMagnifierCanvas(
      new HTMLCanvas(
        this.$refs.magnifierInterpolationCanvas as HTMLCanvasElement,
      ),
    )
  },
  beforeUnmount() {
    this.canvasHandler.detachCanvases(['magnifierMaskCanvas'])
  },
  computed: {
    halfSize(): number {
      return this.magnifier.sizePx / 2
    },
  },
})
</script>
