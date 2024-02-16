<template>
  <div>
    <canvas-plot
      v-for="plot in datasetRepository.activeDataset.scaledPlots(
        canvasHandler.scale,
      )"
      :key="plot.id"
      :plot="plot"
      :isActive="
        datasetRepository.activeDataset.activePlotIds.includes(plot.id)
      "
      :isVisible="
        datasetRepository.activeDataset.visiblePlotIds.includes(plot.id)
      "
      :isManuallyAdded="
        datasetRepository.activeDataset.manuallyAddedPlotIds.includes(plot.id)
      "
    ></canvas-plot>
    <canvas-plot
      v-for="(tempPlot, i) in datasetRepository.activeDataset.scaledTempPlots(
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

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  components: {
    CanvasPlot,
  },
  data() {
    return {
      canvasHandler,
      datasetRepository,
    }
  },

  methods: {},
})
</script>
