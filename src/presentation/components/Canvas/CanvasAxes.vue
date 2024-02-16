<template>
  <div>
    <canvas-axis :axis="axisRepository.x1"></canvas-axis>
    <canvas-axis :axis="axisRepository.x2"></canvas-axis>
    <canvas-axis :axis="axisRepository.y1"></canvas-axis>
    <canvas-axis :axis="axisRepository.y2"></canvas-axis>
    <canvas-axis :axis="axisRepository.x2y2"></canvas-axis>
  </div>
</template>

<script lang="ts">
import { axisRepository } from '@/instanceStore/repositoryInatances'
import CanvasAxis from '@/presentation/components/Canvas/CanvasAxis.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  components: {
    CanvasAxis,
  },
  data() {
    return {
      axisRepository,
    }
  },
})
</script>
