<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeScaledPlots"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="datasets.activePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import Vue from 'vue'
import { datasetMapper } from '@/store/modules/dataset'

export default Vue.extend({
  components: {
    CanvasPlot,
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
  },
  data() {
    return {}
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
