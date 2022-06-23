<template>
  <div
    class="canvas-plot"
    :style="{
      position: 'absolute',
      top: `${plot.yPx - plotHalfSize}px`,
      left: `${plot.xPx - plotHalfSize}px`,
      cursor: 'pointer',
      width: `${plotSize}px`,
      height: `${plotSize}px`,
      'background-color': 'white',
      outline: isActive ? '1px solid red' : '1px solid green',
      'border-radius': '50%',
    }"
    @click="click(plot.id)"
  ></div>
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
    isActive: {
      type: Boolean,
    },
  },
  methods: {
    click(id: number) {
      this.activatePlot(id)
    },
  },
})
</script>
