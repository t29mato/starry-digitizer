<template>
  <div>
    <h5>Selection Area</h5>
    <v-btn-toggle
      :model-value="canvas.maskMode"
      @update:model-value="change"
      density="compact"
      class="pl-2"
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
      @change="setPenToolSizePx"
      type="number"
      hide-details
      label="Pen Size"
    ></v-text-field>
    <v-text-field
      v-if="canvas.maskMode === 2"
      :model-value="canvas.eraserSizePx"
      @change="setEraserSizePx"
      type="number"
      hide-details
      label="Eraser Size (px)"
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
