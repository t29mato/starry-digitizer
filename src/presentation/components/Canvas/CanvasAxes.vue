<template>
  <div>
    <canvas-axis
      :axis="axisRepository.x1"
      :isVisible="axisRepository.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisRepository.x2"
      :isVisible="axisRepository.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisRepository.y1"
      :isVisible="axisRepository.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisRepository.y2"
      :isVisible="axisRepository.isVisible"
    ></canvas-axis>
    <canvas-axis
      :axis="axisRepository.x2y2"
      :isVisible="axisRepository.isVisible"
    ></canvas-axis>
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
