<template>
  <div class="mt-0 mb-0">
    <h5 class="mb-0">Selection Area</h5>
    <v-btn-toggle
      :model-value="canvasHandler.maskMode"
      @update:model-value="change"
      density
      class="mb-2"
      divided
      :border="true"
    >
      <v-btn size="small" class="pa-1" color="primary"> Pen </v-btn>
      <v-btn size="small" class="pa-1" color="primary"> Box </v-btn>
      <v-btn size="small" class="pa-1" color="primary"> Eraser </v-btn>
    </v-btn-toggle>
    <v-btn
      size="small"
      class="ml-1"
      :disabled="!canvasHandler.isDrawnMask"
      @click="clearMask"
    >
      Clear
    </v-btn>
    <v-text-field
      v-if="maskModeIsPen"
      :model-value="canvasHandler.penToolSizePx"
      @change="onChangePenToolSizePx"
      type="number"
      hide-details
      label="Pen Size"
      density
    ></v-text-field>
    <v-text-field
      v-if="maskModeIsEraser"
      :model-value="canvasHandler.eraserSizePx"
      @change="onChangeEraserSizePx"
      type="number"
      hide-details
      label="Eraser Size (px)"
      density
    ></v-text-field>
  </div>
</template>

<script lang="ts">
import { MASK_MODE } from '@/constants'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      canvasHandler,
    }
  },
  computed: {
    maskModeIsPen() {
      return this.canvasHandler.maskMode === MASK_MODE.PEN
    },
    maskModeIsEraser() {
      return this.canvasHandler.maskMode === MASK_MODE.ERASER
    },
  },
  methods: {
    onChangePenToolSizePx(event: Event) {
      this.canvasHandler.setPenToolSizePx(
        Number((<HTMLInputElement>event.target).value),
      )
    },
    onChangeEraserSizePx(event: Event) {
      this.canvasHandler.setEraserSizePx(
        Number((<HTMLInputElement>event.target).value),
      )
    },
    change(value: any) {
      if (value === undefined) {
        this.canvasHandler.setMaskMode(-1)
        return
      }
      this.canvasHandler.setMaskMode(value)
    },
    clearMask() {
      this.canvasHandler.clearMask()
      // INFO: マスク削除後はマスク描画されておらず消しゴムツールを使う必要ないため。
      if (this.canvasHandler.maskMode === MASK_MODE.ERASER) {
        this.canvasHandler.maskMode = MASK_MODE.UNSET
      }
    },
  },
})
</script>
