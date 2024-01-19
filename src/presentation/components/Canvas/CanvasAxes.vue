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
import CanvasAxis from '@/presentation/components/Canvas/CanvasAxis.vue'

import { useAxesStore } from '@/store/axes'
import { mapState } from 'pinia'

import { defineComponent } from 'vue'

export default defineComponent({
  components: {
    CanvasAxis,
  },
  computed: {
    ...mapState(useAxesStore, ['axes']),
  },

  methods: {},
})
</script>
