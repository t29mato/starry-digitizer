<template>
  <div class="mt-2">
    <v-btn
      class="ml-2"
      size="small"
      :disabled="!XYAxisSetRepository.hasAtLeastOneAxis"
      @click="clearAxes"
    >
      Clear Axes</v-btn
    >
    <!-- <v-btn class="ml-2" small :disabled="!XYAxisSetRepository.hasXAxis" @click="clearXAxis">
      Clear X Axis</v-btn
    > -->
    <!-- <v-btn class="ml-2" small :disabled="!XYAxisSetRepository.hasYAxis" @click="clearYAxis">
      Clear Y Axis</v-btn
    > -->
    <v-btn
      size="small"
      class="ml-2"
      :disabled="datasetRepository.activeDataset.plots.length === 0"
      @click="handleOnClickClearPlots"
      >Clear Points</v-btn
    >
    <v-btn
      size="small"
      class="ml-2"
      :disabled="
        datasetRepository.activeDataset.plots.length === 0 ||
        !datasetRepository.activeDataset.nextPlotId
      "
      @click="datasetRepository.activeDataset.clearActivePlots"
      >Clear Active Point</v-btn
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { XYAxisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  data() {
    return {
      interpolator,
      canvasHandler,
      XYAxisSetRepository,
      datasetRepository,
    }
  },
  methods: {
    clearAxes() {
      this.XYAxisSetRepository.activeXYAxisSet.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearXAxis() {
      this.XYAxisSetRepository.activeXYAxisSet.clearXAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearYAxis() {
      this.XYAxisSetRepository.activeXYAxisSet.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    handleOnClickClearPlots() {
      this.datasetRepository.activeDataset.clearPlots()
      this.interpolator.clearPreview()
    },
  },
})
</script>
