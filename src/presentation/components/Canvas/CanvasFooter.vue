<template>
  <div class="mt-2">
    <v-btn
      class="ml-2"
      size="small"
      :disabled="!axes.hasAtLeastOneAxis"
      @click="clearAxes"
    >
      Clear Axes</v-btn
    >
    <!-- <v-btn class="ml-2" small :disabled="!axes.hasXAxis" @click="clearXAxis">
      Clear X Axis</v-btn
    > -->
    <!-- <v-btn class="ml-2" small :disabled="!axes.hasYAxis" @click="clearYAxis">
      Clear Y Axis</v-btn
    > -->
    <v-btn
      size="small"
      class="ml-2"
      :disabled="datasets.activeDataset.plots.length === 0"
      @click="handleOnClickClearPlots"
      >Clear Points</v-btn
    >
    <v-btn
      size="small"
      class="ml-2"
      :disabled="
        datasets.activeDataset.plots.length === 0 ||
        !datasets.activeDataset.nextPlotId
      "
      @click="datasets.activeDataset.clearActivePlots"
      >Clear Active Point</v-btn
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      canvasHandler: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
      datasets: DatasetRepositoryManager.getInstance(),
    }
  },
  methods: {
    clearAxes() {
      this.axes.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearXAxis() {
      this.axes.clearXAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearYAxis() {
      this.axes.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    handleOnClickClearPlots() {
      this.datasets.activeDataset.clearPlots()
      this.interpolator.clearPreview()
    },
  },
})
</script>
