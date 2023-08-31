<template>
  <div>
    <canvas-plot
      v-for="plot in datasets.activeDataset.scaledPlots(canvas.scale)"
      :key="plot.id"
      :plotSizePx="plotSizePx"
      :plot="plot"
      :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
    ></canvas-plot>
  </div>
</template>

<script lang="ts">
import CanvasPlot from '@/components/Canvas/CanvasPlot.vue'
import { defineComponent } from "vue";
import { mapGetters } from 'vuex'

export default defineComponent({
  components: {
    CanvasPlot,
  },
  computed: {
    ...mapGetters('datasets', { datasets: 'datasets' }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
    ...mapGetters('style', { plotSizePx: 'plotSizePx' }),
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
