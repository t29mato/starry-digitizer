<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeDataset.scaledPlots(canvas.scale)"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
      :isVisible="datasets.activeDataset.visiblePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import { defineComponent } from 'vue'

import { useCanvasStore } from '@/store/canvas'
import { useStyleStore } from '@/store/style'
import { useDatasetsStore } from '@/store/datasets'
import { mapState } from 'pinia'

export default defineComponent({
  components: {
    CanvasPlot,
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useStyleStore, ['plotSizePx']),
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
  },
  data() {
    return {}
  },

  methods: {},
})
</script>
