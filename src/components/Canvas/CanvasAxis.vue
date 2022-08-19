<template>
  <div v-if="axis.coord">
    <div
      :style="{
        position: 'absolute',
        top: `${yPx - axisHalfSizePx}px`,
        left: `${xPx - axisCrossBorderHalfPx}px`,
        'pointer-events': 'none',
        width: `${axisCrossBorderPx}px`,
        height: `${axisSizePx}px`,
        background: isActive ? 'red' : 'dodgerblue',
      }"
    >
      <div
        :style="{
          content: '',
          position: 'absolute',
          top: `${axisCrossTopPx}px`,
          left: `${-axisCrossTopPx}px`,
          width: `${axisSizePx}px`,
          height: `${axisCrossBorderPx}px`,
          background: isActive ? 'red' : 'dodgerblue',
        }"
      ></div>
    </div>
    <span
      :style="{
        position: 'absolute',
        top: `${yPx - axisCrossCursorPx}px`,
        left: `${labelLeft}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ axis.name }}</span
    >
  </div>
</template>

<script lang="ts">
import { Axis } from '@/domains/axis'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { styleMapper } from '@/store/modules/style'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...styleMapper.mapGetters([
      'axisSizePx',
      'axisHalfSizePx',
      'axisCrossBorderHalfPx',
      'axisCrossBorderPx',
      'axisCrossTopPx',
      'axisCrossCursorPx',
    ]),
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    xPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.xPx * this.canvas.scale
      }
      return -999
    },
    yPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.yPx * this.canvas.scale
      }
      return -999
    },
    labelLeft(): number {
      if (this.axis.name === 'y1' && this.axes.x1IsSameAsY1) {
        return this.xPx + this.axisCrossCursorPx + 21
      }
      return this.xPx + this.axisCrossCursorPx
    },
    isActive(): boolean {
      if (this.axes.x1IsSameAsY1) {
        if (this.axes.activeAxisName === 'x1') {
          if (this.axis.name === 'y1') {
            return true
          }
        }
      }
      return this.axes.activeAxisName === this.axis.name
    },
  },
  props: {
    axis: {
      type: Object as () => Axis,
      required: true,
    },
  },
  methods: {},
})
</script>
