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
import MagnifierAxis from '@/components/Magnifier/MagnifierAxis.vue'
import { defineComponent } from 'vue'

import { useAxesStore } from '@/store/axes'
import { useCanvasStore } from '@/store/canvas'
import { mapState } from 'pinia'

export default defineComponent({
  components: {
    MagnifierAxis,
  },
  computed: {
    ...mapState(useAxesStore, ['axes']),
    ...mapState(useCanvasStore, ['canvas']),
  },
})
</script>
