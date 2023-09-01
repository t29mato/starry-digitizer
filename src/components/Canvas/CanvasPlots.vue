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

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { useStyleStore } from '@/store/style'
import { useDatasetsStore } from '@/store/datasets'

const canvasStore = useCanvasStore()
const styleStore = useStyleStore()
const datasetsStore = useDatasetsStore()

export default defineComponent({
  components: {
    CanvasPlot,
  },
  computed: {
    datasets: () => datasetsStore.datasets,

    canvas: () => canvasStore.canvas,
    plotSizePx: () => styleStore.plotSizePx,
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
  },
  data() {
    return {}
  },
  props: {},
  methods: {},
})
</script>
