<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeDataset.scaledPlots(canvasHandler.scale)"
      :key="plot.id"
      :plot="plot"
      :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
      :isVisible="datasets.activeDataset.visiblePlotIds.includes(plot.id)"
      :isManuallyAdded="
        datasets.activeDataset.manuallyAddedPlotIds.includes(plot.id)
      "
    ></canvas-plot>
    <canvas-plot
      v-for="(tempPlot, i) in datasets.activeDataset.scaledTempPlots(
        canvasHandler.scale,
      )"
      :key="i"
      :plot="tempPlot"
      :isActive="false"
      :isVisible="true"
      :isTemporary="true"
      :isManuallyAdded="false"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/presentation/components/Canvas/CanvasPlot.vue'
import { defineComponent } from 'vue'

import { useDatasetsStore } from '@/store/datasets'
import { mapState } from 'pinia'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'

export default defineComponent({
  components: {
    CanvasPlot,
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
  },
  data() {
    return {
      canvasHandler: CanvasHandler.getInstance(),
    }
  },

  methods: {},
})
</script>
