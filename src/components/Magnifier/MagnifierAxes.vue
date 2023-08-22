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
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'
import MagnifierAxis from '@/components/Magnifier/MagnifierAxis.vue'

export default {
  setup() {
    const { canvas } = useCanvasStore()
    const { axes } = useAxesStore()
    return {
      canvas,
      axes,
    }
  },
  components: {
    MagnifierAxis,
  },
  props: {},
}
</script>
