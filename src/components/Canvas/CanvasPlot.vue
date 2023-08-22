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
import { useDatasetStore } from '@/store/modules/dataset'
import { useCanvasStore } from '@/store/modules/canvas'
import { Plot } from '@/domains/datasetInterface'
import { computed } from 'vue'

export default {
  setup(props: { plot: Plot; plotSizePx: number; isActive?: boolean }) {
    const { canvas } = useCanvasStore()
    const { toggleActivatedPlot, activatePlot, clearPlot } = useDatasetStore()

    const plotHalfSize = computed(() => props.plotSizePx / 2)
    const xPx = computed(() => props.plot.xPx)
    const yPx = computed(() => props.plot.yPx)

    const cursor = computed(() => {
      const mode = canvas.value.manualMode
      if (mode === 1 || mode === 2) {
        return 'pointer'
      }
      return undefined
    })

    const click = (event: PointerEvent) => {
      switch (canvas.value.manualMode) {
        // INFO: CanvasMain Component -> plot method
        case 0:
          return
        case 1:
          if (event.ctrlKey || event.metaKey) {
            toggleActivatedPlot(props.plot.id)
            return
          }
          activatePlot(props.plot.id)
          return
        case 2:
          clearPlot(props.plot.id)
          return
        default:
          break
      }
    }

    return {
      plotHalfSize,
      xPx,
      yPx,
      cursor,
      click,
    }
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
}
</script>
