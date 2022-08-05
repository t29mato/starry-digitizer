<template>
  <div>
    <magnifier-axis
      :axis="axes.x1"
      label="x1"
      :isActive="axes.activeIndex === 0"
      :canvasCursor="canvasCursor"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.x2"
      label="x2"
      :isActive="axes.activeIndex === 1"
      :canvasCursor="canvasCursor"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y1"
      label="y1"
      :isActive="axes.activeIndex === 2"
      :canvasCursor="canvasCursor"
    ></magnifier-axis>
    <magnifier-axis
      :axis="axes.y2"
      label="y2"
      :isActive="axes.activeIndex === 3"
      :canvasCursor="canvasCursor"
    ></magnifier-axis>
  </div>
</template>

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import MagnifierAxis from '@/components/Magnifier/MagnifierAxis.vue'
import Vue, { PropType } from 'vue'
export default Vue.extend({
  components: {
    MagnifierAxis,
  },
  computed: {
    ...canvasMapper.mapGetters(['canvasScale']),
    ...axesMapper.mapGetters(['axes']),
  },
  props: {
    canvasCursor: {
      type: Object as PropType<{
        xPx: number
        yPx: number
      }>,
      required: true,
    },
  },
})
</script>
