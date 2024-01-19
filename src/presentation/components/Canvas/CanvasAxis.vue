<template>
  <div v-if="axis.coordIsFilled">
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
      v-if="axis.name !== 'x2y2'"
      :style="{
        position: 'absolute',
        top: `${labelTop}px`,
        left: `${labelLeft}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ axis.name }}</span
    >
  </div>
</template>

<script lang="ts">
import { AxisInterface } from '@/domain/axes/axisInterface'
import { defineComponent } from 'vue'

import { useAxesStore } from '@/store/axes'
import { useCanvasStore } from '@/store/canvas'
import { useStyleStore } from '@/store/style'
import { mapState } from 'pinia'

export default defineComponent({
  props: {
    axis: {
      type: Object as () => AxisInterface,
      required: true,
    },
  },
  data() {
    return {
      fontSize: 14,
    }
  },
  computed: {
    ...mapState(useStyleStore, [
      'axisSizePx',
      'axisHalfSizePx',
      'axisCrossBorderHalfPx',
      'axisCrossBorderPx',
      'axisCrossTopPx',
      'axisCrossCursorPx',
    ]),
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useAxesStore, ['axes']),
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
      if (this.axis.name.includes('x')) {
        return this.xPx - this.axisCrossCursorPx / 2
      }
      if (this.axis.name.includes('y')) {
        return this.xPx - this.axisCrossCursorPx * 2
      }
      return 0
    },
    labelTop(): number {
      if (this.axis.name.includes('x')) {
        return this.yPx + this.axisCrossCursorPx / 2
      }
      if (this.axis.name.includes('y')) {
        return this.yPx - this.axisCrossCursorPx
      }
      return 0
    },
    isActive(): boolean {
      if (
        this.axes.pointMode === 0 &&
        this.axes.activeAxisName === 'x1' &&
        this.axis.name === 'y1'
      ) {
        return true
      }

      return this.axes.activeAxisName === this.axis.name
    },
  },
  methods: {},
})
</script>