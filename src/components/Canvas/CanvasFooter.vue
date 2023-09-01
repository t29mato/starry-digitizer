<template>
  <div class="mt-2">
    <v-btn
      class="ml-2"
      small
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
      small
      class="ml-2"
      :disabled="datasets.activeDataset.plots.length === 0"
      @click="clearPlots"
      >Clear Points</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="
        datasets.activeDataset.plots.length === 0 || !datasets.plotsAreActive
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

const axesStore = useAxesStore()
const datasetsStore = useDatasetsStore()

export default defineComponent({
  props: {},
  computed: {
    axes: () => axesStore.axes,
    datasets: () => datasetsStore.datasets,
  },
  methods: {
    ...mapActions('datasets', ['clearPlots', 'clearActivePlots']),
    ...mapActions('axes', [
      'clearAxesCoords',
      'clearXAxisCoords',
      'clearYAxisCoords',
    ]),
    ...mapActions('canvas', ['setManualMode']),
    clearAxes() {
      this.clearAxesCoords()
      this.setManualMode(-1)
    },
    clearXAxis() {
      this.clearXAxisCoords()
      this.setManualMode(-1)
    },
    clearYAxis() {
      this.clearYAxisCoords()
      this.setManualMode(-1)
    },
  },
})
</script>
