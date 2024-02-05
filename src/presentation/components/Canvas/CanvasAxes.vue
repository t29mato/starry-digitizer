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
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'
import CanvasAxis from '@/presentation/components/Canvas/CanvasAxis.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  components: {
    CanvasAxis,
  },
  data() {
    return {
      axes: AxisRepositoryManager.getInstance(),
    }
  },
})
</script>
