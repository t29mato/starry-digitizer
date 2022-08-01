<template>
  <div
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: `${yPx - plotHalfSize}px`,
      left: `${xPx - plotHalfSize}px`,
      cursor: 'pointer',
      width: `${plotSizePx}px`,
      height: `${plotSizePx}px`,
      'background-color': isActive ? 'red' : 'dodgerblue',
      outline: '1px solid white',
      'border-radius': '50%',
    }"
    @click="click"
  ></div>
</template>

<script lang="ts">
import { Plot } from '@/types'
import Vue from 'vue'
import { DatasetManager as DM } from '@/domains/DatasetManager'
const dm = DM.instance

export default Vue.extend({
  computed: {
    plotHalfSize(): number {
      return this.plotSizePx / 2
    },
    xPx(): number {
      return this.plot.xPx
    },
    yPx(): number {
      return this.plot.yPx
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
    click(event: PointerEvent) {
      if (event.ctrlKey || event.metaKey) {
        dm.toggleActivatedPlot(this.plot.id)
        return
      }
      dm.activatePlot(this.plot.id)
    },
  },
})
</script>
