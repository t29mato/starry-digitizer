<template>
  <canvas
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: `${plot.yPx - plotHalfSize}px`,
      left: `${plot.xPx - plotHalfSize}px`,
      cursor: 'pointer',
      outline: '1px dotted red',
    }"
    @click="click(plot.id)"
  ></canvas>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {
    plotHalfSize(): number {
      return this.plotSize / 2
    },
  },
  props: {
    plot: {
      type: Object as () => {
        id: Number
        xPx: Number
        yPx: Number
      },
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
  },
  methods: {
    click(id: number) {
      this.activatePlot(id)
    },
  },
})
</script>
