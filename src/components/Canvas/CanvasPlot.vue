<template>
  <div
    :style="{
      position: 'absolute',
      top: `${plot.yPx - plotHalfSize}px`,
      left: `${plot.xPx - plotHalfSize - adjustMagicNumberPx}px`,
      width: `${plotSize}px`,
      height: `${plotSize}px`,
      'border-radius': '50%',
      'background-color': color,
      'pointer-events': 'auto',
    }"
    @click="click(plot.id)"
  ></div>
</template>

<script lang="ts">
const adjustMagicNumberPx = 1
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      adjustMagicNumberPx,
    }
  },
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
    color: {
      type: String,
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
