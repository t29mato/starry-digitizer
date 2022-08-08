<template>
  <div class="mt-2">
    <v-btn small :disabled="!axes.exist" @click="clearAxes"> Clear Axes</v-btn>
    <v-btn
      small
      class="ml-2"
      :disabled="datasets.activeScaledPlots.length === 0"
      @click="clearPlots"
      >Clear Plots</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="
        datasets.activeScaledPlots.length === 0 || !datasets.plotsAreActive
      "
      @click="clearActivePlots"
      >Clear Active Plot</v-btn
    >
    <!-- TODO: プロットを非表示にするケースが少ないので一旦使わない -->
    <!-- <v-btn
      small
      class="ml-2"
      :disabled="activeScaledPlots.length === 0"
      @click="hidePlots"
      >{{ shouldShowPoints ? 'Hide Plots' : 'Show Plots' }}</v-btn
    > -->
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { datasetMapper } from '@/store/modules/dataset'
import { axesMapper } from '@/store/modules/axes'

export default Vue.extend({
  props: {},
  computed: {
    ...axesMapper.mapGetters(['axes']),
    ...datasetMapper.mapGetters(['datasets']),
  },
  methods: {
    ...datasetMapper.mapActions(['clearPlots', 'clearActivePlots']),
    ...axesMapper.mapActions(['clearAxes']),
  },
})
</script>
