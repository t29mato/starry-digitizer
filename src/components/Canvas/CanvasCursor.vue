<template>
  <div>
    <!-- INFO: right label -->
    <div
      v-if="!(axes.isAdjusting || datasets.activeDataset.plotsAreAdjusting)"
      :style="{
        position: 'absolute',
        top: `${canvas.scaledCursor.yPx - axisCrossCursorPx}px`,
        left: `${canvas.scaledCursor.xPx + axisCrossCursorPx}px`,
        'pointer-events': 'none',
      }"
    >
      {{ rightLabel }}
    </div>
    <!-- INFO: bottom label -->
    <div
      v-if="!axes.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${canvas.scaledCursor.yPx + axisCrossCursorPx / 2}px`,
        left: `${canvas.scaledCursor.xPx - axisCrossCursorPx / 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ bottomLabel }}
    </div>
    <!-- INFO: left label -->
    <div
      v-if="!axes.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${canvas.scaledCursor.yPx - axisCrossCursorPx}px`,
        left: `${canvas.scaledCursor.xPx - axisCrossCursorPx * 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ leftLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'
import { useDatasetStore } from '@/store/modules/dataset'
import { useStyleStore } from '@/store/modules/style'

const axesStore = useAxesStore()
const canvasStore = useCanvasStore()
const datasetStore = useDatasetStore()
const styleStore = useStyleStore()

const rightLabel = computed(() => {
  if (canvasStore.maskMode.value === 0) {
    return 'Pen'
  } else if (canvasStore.maskMode.value === 1) {
    return 'Box'
  } else if (canvasStore.maskMode.value === 2) {
    return 'Eraser'
  } else if (canvasStore.canvas.value.manualMode === 0) {
    return 'Add'
  } else if (canvasStore.canvas.value.manualMode === 1) {
    return 'Edit'
  } else if (canvasStore.canvas.value.manualMode === 2) {
    return 'Delete'
  } else {
    return ''
  }
})

const bottomLabel = computed(() => {
  if (axesStore.axes.value.nextAxis?.name === 'x2y2') {
    return "x2'"
  } else if (axesStore.axes.value.nextAxis?.name.includes('x')) {
    return axesStore.axes.value.nextAxis?.name
  } else {
    return ''
  }
})

const leftLabel = computed(() => {
  if (axesStore.axes.value.nextAxis?.name === 'x2y2') {
    return "y2'"
  } else if (axesStore.axes.value.nextAxis?.name.includes('y')) {
    return axesStore.axes.value.nextAxis.name
  } else if (
    axesStore.axes.value.nextAxis?.name === 'x1' &&
    axesStore.axes.value.pointMode === 0
  ) {
    return 'y1'
  } else {
    return ''
  }
})

const axisCrossCursorPx = computed(() => styleStore.axisCrossCursorPx.value)
const canvas = computed(() => canvasStore.canvas.value)
const axes = computed(() => axesStore.axes.value)
const datasets = computed(() => datasetStore.datasets.value)
</script>
