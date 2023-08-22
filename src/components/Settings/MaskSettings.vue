<template>
  <div>
    <h5>Selection Area</h5>
    <v-btn-toggle
      :model-value="maskMode"
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
import { useCanvasStore } from '@/store/modules/canvas'

export default {
  setup() {
    const {
      canvas,
      maskMode,
      setPenToolSizePx,
      setEraserSizePx,
      setMaskMode,
      clearMask,
    } = useCanvasStore()

    return {
      canvas,
      maskMode,
      setPenToolSizePx,
      setEraserSizePx,
      setMaskMode,
      clearMask,
    }
  },
  methods: {
    change(value: any) {
      const { setMaskMode } = useCanvasStore()
      if (value === undefined) {
        setMaskMode(-1)
        return
      }
      setMaskMode(value)
    },
  },
}
</script>
