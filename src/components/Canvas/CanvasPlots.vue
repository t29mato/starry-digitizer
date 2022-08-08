<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeScaledPlots"
      :key="plot.id"
      :plotSizePx="canvas.plotSizePx"
      :plot="plot"
      :isActive="datasets.activePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import Vue from 'vue'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'

export default Vue.extend({
  components: {
    CanvasPlot,
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...canvasMapper.mapGetters(['canvas']),
    plotHalfSize(): number {
      return this.canvas.plotSizePx / 2
    },
  },
  data() {
    return {}
  },
  props: {},
  methods: {},
})
</script>
