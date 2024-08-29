<template>
  <div>
    <magnifier-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x1"
      :isActive="XYAxisSetRepository.activeXYAxisSet.activeAxisName === 'x1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x2"
      :isActive="XYAxisSetRepository.activeXYAxisSet.activeAxisName === 'x2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.y1"
      :isActive="XYAxisSetRepository.activeXYAxisSet.activeAxisName === 'y1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.y2"
      :isActive="XYAxisSetRepository.activeXYAxisSet.activeAxisName === 'y2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="XYAxisSetRepository.activeXYAxisSet.x2y2"
      :isActive="XYAxisSetRepository.activeXYAxisSet.activeAxisName === 'x2y2'"
    ></magnifier-axis>
  </div>
</template>

<script lang="ts">
import { XYAxisSetRepository } from '@/instanceStore/repositoryInatances'
import MagnifierAxis from '@/presentation/components/Magnifier/MagnifierAxis.vue'
import { defineComponent } from 'vue'
export default defineComponent({
  components: {
    MagnifierAxis,
  },
  data() {
    return {
      XYAxisSetRepository,
    }
  },
})
</script>
