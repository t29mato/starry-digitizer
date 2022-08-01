<template>
  <div>
    <canvas-plot
      v-for="plot in plots"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="activePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import Vue from 'vue'
import { DatasetManager as DM } from '@/domains/DatasetManager'
import { Plots } from '@/types'
const dm = DM.instance

export default Vue.extend({
  components: {
    CanvasPlot,
  },
  computed: {
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
    plots(): Plots {
      return dm.activeScaledPlots
    },
  },
  data() {
    return {
      activePlotIds: dm.activePlotIds,
    }
  },
  props: {
    plotSizePx: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
  },
  methods: {},
})
</script>
