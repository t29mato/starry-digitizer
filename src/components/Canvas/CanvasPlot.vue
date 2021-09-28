<template>
  <div
    :style="{
      position: 'absolute',
      top: `${plot.yPx - plotHalfSize}px`,
      left: `${plot.xPx - plotHalfSize}px`,
      'pointer-events': 'none',
      width: `${plotSize}px`,
      height: `${plotSize}px`,
      'border-radius': '50%',
      'background-color': 'red',
    }"
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
  },
})
</script>
