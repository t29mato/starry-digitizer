<template>
  <div
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: `${yPx - plotHalfSize}px`,
      left: `${xPx - plotHalfSize}px`,
      cursor: cursor,
      width: `${plotSizePx}px`,
      height: `${plotSizePx}px`,
      'background-color': isActive ? 'red' : 'dodgerblue',
      border: '1px solid white',
      'border-radius': '50%',
    }"
    @click="click"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapActions } from 'vuex'

import { Plot } from '@/domains/datasetInterface'

export default defineComponent({
  computed: {
    ...mapGetters('canvas', { canvas: 'canvas' }),
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
    xPx(): number {
      return this.plot.xPx
    },
    yPx(): number {
      return this.plot.yPx
    },
    cursor(): string | undefined {
      const mode = this.canvas.manualMode
      if (mode === 1 || mode === 2) {
        return 'pointer'
      }
      return undefined
    },
  },
  props: {
    plot: {
      type: Object as () => Plot,
      required: true,
    },
    plotSizePx: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
  },
  methods: {
    ...mapActions('datasets', [
      'toggleActivatedPlot',
      'activatePlot',
      'clearPlot',
    ]),
    click(event: PointerEvent) {
      switch (this.canvas.manualMode) {
        // INFO: CanvasMain Component -> plot method
        case 0:
          return
        case 1:
          if (event.ctrlKey || event.metaKey) {
            this.toggleActivatedPlot(this.plot.id)
            return
          }
          this.activatePlot(this.plot.id)
          return
        case 2:
          this.clearPlot(this.plot.id)
          return
        default:
          break
      }
    },
  },
})
</script>
