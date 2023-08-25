<template>
  <div>
    <canvas-axis :axis="x1"></canvas-axis>
    <canvas-axis :axis="x2"></canvas-axis>
    <canvas-axis :axis="y1"></canvas-axis>
    <canvas-axis :axis="y2"></canvas-axis>
    <canvas-axis :axis="x2y2"></canvas-axis>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import CanvasAxis from '@/components/Canvas/CanvasAxis.vue'

import Vue from 'vue'
export default Vue.extend({
  components: {
    CanvasAxis,
  },
  computed: {
    ...mapState('axes', {
      x1: (state: any) => state.x1,
      x2: (state: any) => state.x2,
      y1: (state: any) => state.y1,
      y2: (state: any) => state.y2,
      x2y2: (state: any) => state.x2y2,
    }),
  },
  props: {},
  methods: {},
})
</script>
