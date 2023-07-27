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
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import MagnifierAxis from '@/components/Magnifier/MagnifierAxis.vue'
import Vue from 'vue'
export default Vue.extend({
  components: {
    MagnifierAxis,
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
  },
  props: {},
})
</script>
