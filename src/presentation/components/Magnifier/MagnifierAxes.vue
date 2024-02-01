<template>
  <div>
    <magnifier-axis
      :axis="axes.x1"
      :isActive="axes.activeAxisName === 'x1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.x2"
      :isActive="axes.activeAxisName === 'x2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y1"
      :isActive="axes.activeAxisName === 'y1'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y2"
      :isActive="axes.activeAxisName === 'y2'"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.x2y2"
      :isActive="axes.activeAxisName === 'x2y2'"
    ></magnifier-axis>
  </div>
</template>

<script lang="ts">
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'
import MagnifierAxis from '@/presentation/components/Magnifier/MagnifierAxis.vue'
import { defineComponent } from 'vue'
export default defineComponent({
  components: {
    MagnifierAxis,
  },
  data() {
    return {
      axes: AxisRepositoryManager.getInstance(),
    }
  },
})
</script>
