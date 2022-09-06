<template>
  <div class="mt-2">
    <v-btn
      class="ml-2"
      small
      :disabled="!axes.hasAtLeastOneAxis"
      @click="clickAxes"
    >
      Clear Axes</v-btn
    >
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
import Vue from 'vue'
import { datasetMapper } from '@/store/modules/dataset'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'

export default Vue.extend({
  props: {},
  computed: {
    ...axesMapper.mapGetters(['axes']),
    ...datasetMapper.mapGetters(['datasets']),
  },
  methods: {
    ...datasetMapper.mapActions(['clearPlots', 'clearActivePlots']),
    ...axesMapper.mapActions(['clearAxesCoords']),
    ...canvasMapper.mapActions(['setManualMode']),
    clickAxes() {
      this.clearAxesCoords()
      this.setManualMode(-1)
    },
  },
})
</script>
