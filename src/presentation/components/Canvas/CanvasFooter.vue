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

import { useAxesStore } from '@/store/axes'
import { useDatasetsStore } from '@/store/datasets'
import { useCanvasStore } from '@/store/canvas'
import { mapState, mapActions } from 'pinia'

import { Interpolator } from '@/application/services/interpolator/interpolator'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
    }
  },
  computed: {
    ...mapState(useAxesStore, ['axes']),
    ...mapState(useDatasetsStore, ['datasets']),
  },
  methods: {
    ...mapActions(useDatasetsStore, ['clearPlots', 'clearActivePlots']),
    ...mapActions(useAxesStore, [
      'clearAxesCoords',
      'clearXAxisCoords',
      'clearYAxisCoords',
    ]),
    ...mapActions(useCanvasStore, ['setManualMode']),
    clearAxes() {
      this.clearAxesCoords()
      this.setManualMode(-1)
    },
    clearXAxis() {
      this.clearXAxisCoords()
      this.setManualMode(-1)
    },
    clearYAxis() {
      this.clearAxesCoords()
      this.setManualMode(-1)
    },
    handleOnClickClearPlots() {
      this.clearPlots()
      this.interpolator.clearPreview()
    },
  },
})
</script>
@/application/services/interpolator/interpolator/interpolator
