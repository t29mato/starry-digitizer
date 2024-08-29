<template>
  <div>
    <canvas-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x1"
      :isVisible="XYAxisSetRepository.activeXYAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x2"
      :isVisible="XYAxisSetRepository.activeXYAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.y1"
      :isVisible="XYAxisSetRepository.activeXYAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.y2"
      :isVisible="XYAxisSetRepository.activeXYAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x2y2"
      :isVisible="XYAxisSetRepository.activeXYAxisSet.isVisible"
    ></canvas-axis>
  </div>
</template>

<script lang="ts">
import { XYAxisSetRepository } from '@/instanceStore/repositoryInatances'
import CanvasAxis from '@/presentation/components/Canvas/CanvasAxis.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  components: {
    CanvasAxis,
  },
  data() {
    return {
      XYAxisSetRepository,
    }
  },
})
</script>
