<template>
  <div>
    <canvas-axis :axis="axes.x1"></canvas-axis>
    <canvas-axis :axis="axes.x2"></canvas-axis>
    <canvas-axis :axis="axes.y1"></canvas-axis>
    <canvas-axis :axis="axes.y2"></canvas-axis>
    <canvas-axis :axis="axes.x2y2"></canvas-axis>
  </div>
</template>

<script lang="ts">
import { mapGetters } from 'vuex'
import CanvasAxis from '@/components/Canvas/CanvasAxis.vue'

import Vue from 'vue'
export default Vue.extend({
  components: {
    CanvasAxis,
  },
  computed: {
    ...mapGetters('axes', { axes: 'axes' }),
  },
  props: {},
  methods: {},
})
</script>
