<template>
  <div>
    <canvas-axis
      :axis="axisSetRepository.activeAxisSet.x1"
      :isVisible="axisSetRepository.activeAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisSetRepository.activeAxisSet.x2"
      :isVisible="axisSetRepository.activeAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisSetRepository.activeAxisSet.y1"
      :isVisible="axisSetRepository.activeAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisSetRepository.activeAxisSet.y2"
      :isVisible="axisSetRepository.activeAxisSet.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisSetRepository.activeAxisSet.x2y2"
      :isVisible="axisSetRepository.activeAxisSet.isVisible"
    ></canvas-axis>
  </div>
</template>

<script lang="ts">
import { AxisSetRepository } from '@/instanceStore/repositoryInatances'
import CanvasAxis from '@/presentation/components/Canvas/CanvasAxis.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  components: {
    CanvasAxis,
  },
  data() {
    return {
      axisSetRepository: AxisSetRepository,
    }
  },
})
</script>
