<template>
  <div class="mt-2">
    <v-btn small :disabled="axes.nextIndex !== 2" @click="sameAsX1"
      >Same as X1</v-btn
    >
    <v-btn class="ml-2" small :disabled="!axes.exist" @click="clickAxes">
      Clear Axes</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="datasets.activeDataset.plots.length === 0"
      @click="clearPlots"
      >Clear Plots</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="
        datasets.activeDataset.plots.length === 0 || !datasets.plotsAreActive
      "
      @click="clearActivePlots"
      >Clear Active Plot</v-btn
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
    ...axesMapper.mapActions(['clearAxes', 'addAxis']),
    ...canvasMapper.mapActions(['setManualMode']),
    clickAxes() {
      this.clearAxes()
      this.setManualMode(-1)
    },
    sameAsX1() {
      this.addAxis(this.axes.x1)
    },
  },
})
</script>
