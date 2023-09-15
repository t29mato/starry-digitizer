<template>
  <div class="mt-3 mb-5">
    <h5 class="mb-2">Selection Area</h5>
    <v-btn-toggle
      :model-value="canvas.maskMode"
      @update:model-value="change"
      density="compact"
      class="mb-2"
      divided
      variant="outlined"
    >
      <v-btn size="small" color="primary"> Pen </v-btn>
      <v-btn size="small" color="primary"> Box </v-btn>
      <v-btn size="small" color="primary"> Eraser </v-btn>
    </v-btn-toggle>
    <v-btn
      size="small"
      class="ml-1"
      :disabled="!canvas.isDrawnMask"
      @click="clearMask"
    >
      Clear
    </v-btn>
    <v-text-field
      v-if="canvas.maskMode === 0"
      :model-value="canvas.penToolSizePx"
      @change="onChangePenToolSizePx"
      type="number"
      hide-details
      label="Pen Size"
      density="compact"
    ></v-text-field>
    <v-text-field
      v-if="canvas.maskMode === 2"
      :model-value="canvas.eraserSizePx"
      @change="onChangeEraserSizePx"
      type="number"
      hide-details
      label="Eraser Size (px)"
      density="compact"
    ></v-text-field>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
  },

  methods: {
    ...mapActions(useCanvasStore, [
      'setPenToolSizePx',
      'setMaskMode',
      'setEraserSizePx',
    ]),
    onChangePenToolSizePx(event: Event) {
      this.setPenToolSizePx(Number((<HTMLInputElement>event.target).value))
    },
    onChangeEraserSizePx(event: Event) {
      this.setEraserSizePx(Number((<HTMLInputElement>event.target).value))
    },
    change(value: any) {
      if (value === undefined) {
        this.setMaskMode(-1)
        return
      }
      this.setMaskMode(value)
    },
    clearMask() {
      this.canvas.clearMask()
      // INFO: マスク削除後はマスク描画されておらず消しゴムツールを使う必要ないため。
      if (this.canvas.maskMode === 2) {
        this.canvas.maskMode = -1
      }
    },
  },
})
</script>
