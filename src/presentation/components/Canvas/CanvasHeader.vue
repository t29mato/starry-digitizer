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
      <v-btn size="small" class="ml-2" @click="drawFitSizeImage">Fit</v-btn>
    </div>
    <span class="ma-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { mapState, mapActions } from 'pinia'
import { Interpolator } from '@/application/services/interpolator/interpolator'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
    }
  },
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
    showCanvasScale(): string {
      return Math.trunc(this.canvas.scale * 100) + '%'
    },
  },
  methods: {
    ...mapActions(useCanvasStore, [
      'scaleUp',
      'scaleDown',
      'resizeCanvasToOriginal',
      'drawFitSizeImage',
    ]),
    handleOnClickScaleUpButton() {
      this.scaleUp()
      this.interpolator.resizeCanvas()
    },
    handleOnClickScaleDownButton() {
      this.scaleDown()
      this.interpolator.resizeCanvas()
    },
    handleOnClickResetScaleButton() {
      this.resizeCanvasToOriginal()
      this.interpolator.resizeCanvas()
    },
  },
})
</script>
@/application/services/interpolator/interpolator/interpolator
