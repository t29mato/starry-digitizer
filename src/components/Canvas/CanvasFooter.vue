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
      @click="clearPlots"
      >Clear Points</v-btn
    >
    <v-btn
      size="small"
      class="ml-2"
      :disabled="
        datasets.activeDataset.plots.length === 0 || !datasets.plotsAreActive
      "
      @click="clearActivePlots"
      >Clear Active Point</v-btn
    >
  </div>
</template>

<script setup lang="ts">
import { useDatasetStore } from '@/store/modules/dataset'
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'

const datasetStore = useDatasetStore()
const axesStore = useAxesStore()
const axes = axesStore.axes
const datasets = datasetStore.datasets
const canvasStore = useCanvasStore()

function clearPlots() {
  datasetStore.clearPlots()
}

function clearActivePlots() {
  datasetStore.clearActivePlots()
}

function clearAxesCoords() {
  axesStore.clearAxesCoords()
  canvasStore.setManualMode(-1)
}

// function clearXAxisCoords() {
//   axesStore.clearXAxisCoords()
//   canvasStore.setManualMode(-1)
// }

// function clearYAxisCoords() {
//   axesStore.clearYAxisCoords()
//   canvasStore.setManualMode(-1)
// }

function clearAxes() {
  clearAxesCoords()
  canvasStore.setManualMode(-1)
}

// function clearXAxis() {
//   clearXAxisCoords()
//   canvasStore.setManualMode(-1)
// }

// function clearYAxis() {
//   clearYAxisCoords()
//   canvasStore.setManualMode(-1)
// }
</script>
