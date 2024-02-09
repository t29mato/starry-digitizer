<template>
  <div>
    <magnifier-axis
      :axis="axisRepository.x1"
      :isActive="axisRepository.activeAxisName === 'x1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisRepository.x2"
      :isActive="axisRepository.activeAxisName === 'x2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisRepository.y1"
      :isActive="axisRepository.activeAxisName === 'y1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisRepository.y2"
      :isActive="axisRepository.activeAxisName === 'y2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axisRepository.x2y2"
      :isActive="axisRepository.activeAxisName === 'x2y2'"
    ></magnifier-axis>
  </div>
</template>

<script lang="ts">
import { axisRepository } from '@/instanceStore/repositoryInatances'
import MagnifierAxis from '@/presentation/components/Magnifier/MagnifierAxis.vue'
import { defineComponent } from 'vue'
export default defineComponent({
  components: {
    MagnifierAxis,
  },
  data() {
    return {
      axisRepository,
    }
  },
})
</script>
