<template>
  <div class="mt-2">
    <v-btn
      class="ml-2"
      size="small"
      :disabled="!axisSetRepository.activeAxisSet.hasAtLeastOneAxis"
      @click="clearAxisSet"
    >
      Clear XY Axes</v-btn
    >
    <!-- <v-btn class="ml-2" small :disabled="!axisSetRepository.activeAxisSet.hasXAxis" @click="clearXAxis">
      Clear X Axis</v-btn
    > -->
    <!-- <v-btn class="ml-2" small :disabled="!axisSetRepository.activeAxisSet.hasYAxis" @click="clearYAxis">
      Clear Y Axis</v-btn
    > -->
    <v-btn
      size="small"
      class="ml-2"
      :disabled="datasetRepository.activeDataset.points.length === 0"
      @click="handleOnClickClearPoints"
      >Clear Points</v-btn
    >
    <v-btn
      size="small"
      class="ml-2"
      :disabled="
        datasetRepository.activeDataset.points.length === 0 ||
        !datasetRepository.activeDataset.nextPointId
      "
      @click="datasetRepository.activeDataset.clearActivePoints"
      >Clear Active Point</v-btn
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  data() {
    return {
      interpolator,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  methods: {
    clearAxisSet() {
      this.axisSetRepository.activeAxisSet.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearXAxis() {
      this.axisSetRepository.activeAxisSet.clearXAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    clearYAxis() {
      this.axisSetRepository.activeAxisSet.clearAxisCoords()
      this.canvasHandler.setManualMode(-1)
    },
    handleOnClickClearPoints() {
      this.datasetRepository.activeDataset.clearPoints()
      this.interpolator.clearPreview()
    },
  },
})
</script>
