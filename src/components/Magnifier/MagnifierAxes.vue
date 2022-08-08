<template>
  <div>
    <magnifier-axis
      :axis="axes.x1"
      label="x1"
      :isActive="axes.activeIndex === 0"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.x2"
      label="x2"
      :isActive="axes.activeIndex === 1"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y1"
      label="y1"
      :isActive="axes.activeIndex === 2"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y2"
      label="y2"
      :isActive="axes.activeIndex === 3"
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
