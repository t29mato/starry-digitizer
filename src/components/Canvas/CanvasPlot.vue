<template>
  <div
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: `${yPx - plotHalfSize}px`,
      left: `${xPx - plotHalfSize}px`,
      cursor: 'pointer',
      width: `${plotSize}px`,
      height: `${plotSize}px`,
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
export default Vue.extend({
  computed: {
    plotHalfSize(): number {
      return this.plotSize / 2
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
    plotSize: {
      type: Number,
      required: true,
    },
    activatePlot: {
      type: Function,
      required: true,
    },
    toggleActivatedPlot: {
      type: Function,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
  },
  methods: {
    click(event: PointerEvent) {
      if (event.ctrlKey || event.metaKey) {
        this.toggleActivatedPlot(this.plot.id)
        return
      }
      this.activatePlot(this.plot.id)
    },
  },
})
</script>
