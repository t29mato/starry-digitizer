<template>
  <div
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: top,
      left: left,
      cursor: cursor,
      width: size,
      height: size,
      'background-color': backgroundColor,
      border: '1px solid white',
      'border-radius': borderRadius,
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
      zIndex: zIndex,
    }"
    @click="click"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Plot } from '@/domain/models/dataset/datasetInterface'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { STYLE } from '@/constants/constants'

export default defineComponent({
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      canvasHandler: CanvasHandler.getInstance(),
      datasets: datasetRepository,
      plotOpacity: STYLE.plotOpacity,
      tempPlotOpacity: STYLE.tempPlotOpacity,
      plotSizePx: STYLE.plotSizePx,
      tempPlotSizePx: STYLE.tempPlotSizePx,
    }
  },
  computed: {
    xPx(): number {
      return this.plot.xPx
    },
    yPx(): number {
      return this.plot.yPx
    },
    cursor(): string | undefined {
      const mode = this.canvasHandler.manualMode
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

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '#6a5acd'
      }

      return '#1e90ff'
    },
    borderRadius(): string {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にplotで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    size(): string {
      if (this.isTemporary) {
        return this.tempPlotSizePx + 'px'
      }

      return this.plotSizePx + 'px'
    },
    top(): string {
      if (this.isTemporary) {
        return this.yPx - this.tempPlotSizePx / 2 + 'px'
      }

      return this.yPx - this.plotSizePx / 2 + 'px'
    },
    left(): string {
      if (this.isTemporary) {
        return this.xPx - this.tempPlotSizePx / 2 + 'px'
      }

      return this.xPx - this.plotSizePx / 2 + 'px'
    },
    zIndex(): string {
      if (this.isTemporary) {
        return '1'
      }

      return '2'
    },
  },
  props: {
    plot: {
      type: Object as () => Plot,
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
    click(event: MouseEvent) {
      switch (this.canvasHandler.manualMode) {
        // INFO: CanvasMain Component -> plot method
        case 0:
          return
        case 1:
          if (event.ctrlKey || event.metaKey) {
            this.datasets.activeDataset.toggleActivatedPlot(this.plot.id)
            return
          }
          this.datasets.activeDataset.switchActivatedPlot(this.plot.id)
          return
        case 2:
          this.datasets.activeDataset.clearPlot(this.plot.id)

          return
        default:
          break
      }
    },
  },
})
</script>
