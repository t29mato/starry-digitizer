<template>
  <div class="mt-2">
    <v-btn small :disabled="axes.length === 0" @click="clearAxes">
      Clear Axes</v-btn
    >
    <v-btn small class="ml-2" :disabled="plots.length === 0" @click="clearPlots"
      >Clear Plots</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="plots.length === 0 || !plotIsActive"
      @click="clearActivePlots"
      >Clear Active Plot</v-btn
    >
    <v-btn
      small
      class="ml-2"
      :disabled="plots.length === 0"
      @click="switchShowPlots"
      >{{ shouldShowPoints ? 'Hide Plots' : 'Show Plots' }}</v-btn
    >
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { DatasetManager as DM } from '@/domains/DatasetManager'
const dm = DM.instance

export default Vue.extend({
  props: {
    plotIsActive: {
      type: Boolean,
      required: true,
    },
    shouldShowPoints: {
      type: Boolean,
      required: true,
    },
    plots: {
      type: Array as PropType<{ id: number; xPx: number; yPx: number }[]>,
    },
    axes: {
      type: Array as PropType<
        {
          xPx: number
          yPx: number
        }[]
      >,
    },
    clearAxes: {
      type: Function,
      required: true,
    },
    clearPlots: {
      type: Function,
      required: true,
    },
    switchShowPlots: {
      type: Function,
      required: true,
    },
  },
  methods: {
    clearActivePlots() {
      dm.clearActivePlots()
    },
  },
})
</script>
