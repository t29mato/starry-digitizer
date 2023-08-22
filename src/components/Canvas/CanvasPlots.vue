<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeDataset.scaledPlots(canvas.scale)"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script setup lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import { useDatasetStore } from '@/store/modules/dataset'
import { useCanvasStore } from '@/store/modules/canvas'
import { useStyleStore } from '@/store/modules/style'

const { datasets } = useDatasetStore()
const { canvas } = useCanvasStore()
const { plotSizePx } = useStyleStore()
</script>
