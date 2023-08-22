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
import { useAxesStore } from '@/store/modules/axes'

export default {
  setup() {
    const { axes } = useAxesStore()
    return {
      axes,
    }
  },
}
</script>
