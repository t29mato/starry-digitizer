<template>
  <div class="d-flex justify-end">
    <div></div>
    <div class="ml-2">
      <v-btn size="small" @click="handleOnClickScaleDownButton"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
      <v-btn size="small" class="ml-2" @click="handleOnClickScaleUpButton"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        id="reset-canvas-scale"
        size="small"
        class="ml-2"
        @click="handleOnClickResetScaleButton"
        >100%</v-btn
      >
      <v-btn size="small" class="ml-2" @click="canvas.drawFitSizeImage"
        >Fit</v-btn
      >
    </div>
    <span class="ma-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { Canvas } from '@/application/services/canvas/canvas'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      canvas: Canvas.getInstance(),
    }
  },
  computed: {
    showCanvasScale(): string {
      return Math.trunc(this.canvas.scale * 100) + '%'
    },
  },
  methods: {
    handleOnClickScaleUpButton() {
      this.canvas.scaleUp()
      this.interpolator.resizeCanvas()
    },
    handleOnClickScaleDownButton() {
      this.canvas.scaleDown()
      this.interpolator.resizeCanvas()
    },
    handleOnClickResetScaleButton() {
      this.canvas.drawOriginalSizeImage()
      this.interpolator.resizeCanvas()
    },
  },
})
</script>
