<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeScaledPlots(canvas.scale)"
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
import { canvasMapper } from '@/store/modules/canvas'
import { styleMapper } from '@/store/modules/style'

export default Vue.extend({
  components: {
    CanvasPlot,
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...canvasMapper.mapGetters(['canvas']),
    ...styleMapper.mapGetters(['plotSizePx']),
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
  },
  data() {
    return {}
  },
  props: {},
  methods: {},
})
</script>
