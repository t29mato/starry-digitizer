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
      'background-color': backgroundColor,
      border: '1px solid white',
      'border-radius': borderRadius,
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
    }"
    @click="click"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Plot } from '@/domains/datasetInterface'

import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { mapState, mapActions } from 'pinia'
import { useStyleStore } from '@/store/style'
import { useInterpolatorStore } from '@/store/interpolator'

export default defineComponent({
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useStyleStore, ['plotOpacity', 'tempPlotOpacity']),
    ...mapState(useInterpolatorStore, ['interpolator']),
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
    opacity() {
      return this.isTemporary ? this.tempPlotOpacity : this.plotOpacity
    },
    backgroundColor() {
      if (this.isActive) {
        return '#ff0000'
      }

      return '#1e90ff'
    },
    borderRadius() {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にplotで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded) {
        return '0'
      }

      return '50%'
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
    isVisible: {
      type: Boolean,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    isManuallyAdded: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    ...mapActions(useDatasetsStore, [
      'toggleActivatedPlot',
      'switchActivatedPlot',
      'clearPlot',
    ]),
    click(event: MouseEvent) {
      switch (this.canvas.manualMode) {
        // INFO: CanvasMain Component -> plot method
        case 0:
          return
        case 1:
          if (event.ctrlKey || event.metaKey) {
            this.toggleActivatedPlot(this.plot.id)
            return
          }
          this.switchActivatedPlot(this.plot.id)
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
