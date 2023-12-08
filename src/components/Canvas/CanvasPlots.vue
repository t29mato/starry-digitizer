<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeDataset.scaledPlots(canvas.scale)"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
      :isVisible="datasets.activeDataset.visiblePlotIds.includes(plot.id)"
      :isManuallyAdded="
        datasets.activeDataset.manuallyAddedPlotIds.includes(plot.id)
      "
    ></canvas-plot>
    <canvas-plot
      v-for="(tempPlot, i) in datasets.activeDataset.scaledTempPlots(
        canvas.scale,
      )"
      :key="i"
      :plotSizePx="plotSizePx"
      :plot="tempPlot"
      :isActive="false"
      :isVisible="true"
      :isTemporary="true"
      :isManuallyAdded="false"
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
