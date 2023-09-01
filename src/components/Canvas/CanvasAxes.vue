<template>
  <div>
    <canvas-axis :axis="axes.x1"></canvas-axis>
    <canvas-axis :axis="axes.x2"></canvas-axis>
    <canvas-axis :axis="axes.y1"></canvas-axis>
    <canvas-axis :axis="axes.y2"></canvas-axis>
    <canvas-axis :axis="axes.x2y2"></canvas-axis>
  </div>
</template>

<script lang="ts">
import CanvasAxis from '@/components/Canvas/CanvasAxis.vue'
import { useAxesStore } from '@/store/axes'

import { defineComponent } from 'vue'

const axesStore = useAxesStore()

export default defineComponent({
  components: {
    CanvasAxis,
  },
  computed: {
    axes: () => axesStore.axes,
  },
  props: {},
  methods: {},
})
</script>
