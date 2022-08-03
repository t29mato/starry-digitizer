<template>
  <div class="mt-2">
    <v-btn small :disabled="axes.length === 0" @click="clearAxes">
      Clear Axes</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="activeScaledPlots.length === 0"
      @click="clearPlots"
      >Clear Plots</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="activeScaledPlots.length === 0 || !plotsAreActive"
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
import Vue, { PropType } from 'vue'
import { datasetMapper } from '@/store/modules/dataset'

export default Vue.extend({
  props: {
    shouldShowPoints: {
      type: Boolean,
      required: true,
    },
    axes: {
      type: Array as PropType<
        {
          xPx: number
          yPx: number
        }[]
      >,
    },
    // FIXME: clearAxes doesn't work
    clearAxes: {
      type: Function,
      required: true,
    },
  },
  computed: {
    ...datasetMapper.mapGetters(['activeScaledPlots', 'plotsAreActive']),
  },
  methods: {
    ...datasetMapper.mapActions(['clearPlots', 'clearActivePlots']),
  },
})
</script>
