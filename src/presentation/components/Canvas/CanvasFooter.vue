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
      @click="clearActivePlots"
      >Clear Active Point</v-btn
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDatasetsStore } from '@/store/datasets'
import { mapState, mapActions } from 'pinia'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      canvas: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
    }
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
  },
  methods: {
    ...mapActions(useDatasetsStore, ['clearPlots', 'clearActivePlots']),
    clearAxes() {
      this.axes.clearAxisCoords()
      this.canvas.setManualMode(-1)
    },
    clearXAxis() {
      this.axes.clearXAxisCoords()
      this.canvas.setManualMode(-1)
    },
    clearYAxis() {
      this.axes.clearAxisCoords()
      this.canvas.setManualMode(-1)
    },
    handleOnClickClearPlots() {
      this.clearPlots()
      this.interpolator.clearPreview()
    },
  },
})
</script>
