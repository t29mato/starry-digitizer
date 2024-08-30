<template>
  <div>
    <magnifier-axis
      :axis="axisSetRepository.activeAxisSet.x1"
      :isActive="axisSetRepository.activeAxisSet.activeAxisName === 'x1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisSetRepository.activeAxisSet.x2"
      :isActive="axisSetRepository.activeAxisSet.activeAxisName === 'x2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisSetRepository.activeAxisSet.y1"
      :isActive="axisSetRepository.activeAxisSet.activeAxisName === 'y1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisSetRepository.activeAxisSet.y2"
      :isActive="axisSetRepository.activeAxisSet.activeAxisName === 'y2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisSetRepository.activeAxisSet.x2y2"
      :isActive="axisSetRepository.activeAxisSet.activeAxisName === 'x2y2'"
    ></magnifier-axis>
  </div>
</template>

<script lang="ts">
import { AxisSetRepository } from '@/instanceStore/repositoryInatances'
import MagnifierAxis from '@/presentation/components/Magnifier/MagnifierAxis.vue'
import { defineComponent } from 'vue'
export default defineComponent({
  components: {
    MagnifierAxis,
  },
  data() {
    return {
      axisSetRepository: AxisSetRepository,
    }
  },
})
</script>
