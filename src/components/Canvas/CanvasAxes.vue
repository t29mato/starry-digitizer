<template>
  <div>
    <canvas-axis
      :axis="axes.x1"
      label="x1"
      :isActive="axes.activeIndex === 0"
    ></canvas-axis>
    <canvas-axis
      :axis="axes.x2"
      label="x2"
      :isActive="axes.activeIndex === 1"
    ></canvas-axis>
    <canvas-axis
      :axis="axes.y1"
      label="y1"
      :isActive="axes.activeIndex === 2"
    ></canvas-axis>
    <canvas-axis
      :axis="axes.y2"
      label="y2"
      :isActive="axes.activeIndex === 3"
    ></canvas-axis>
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import CanvasAxis from '@/components/Canvas/CanvasAxis.vue'

import Vue from 'vue'
export default Vue.extend({
  components: {
    CanvasAxis,
  },
  computed: {
    ...axesMapper.mapGetters(['axes']),
  },
  props: {},
  methods: {},
})
</script>
