<template>
  <div>
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
        left: `${xPx + axisCrossCursorPx}px`,
        'pointer-events': 'none',
        'user-select': 'none',
      }"
      >{{ label }}</span
    >
  </div>
</template>

<script lang="ts">
import { canvasMapper } from '@/store/modules/canvas'
import { styleMapper } from '@/store/modules/style'
import { Position } from '@/types'
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
    xPx(): number {
      return this.axis.xPx * this.canvas.scale
    },
    yPx(): number {
      return this.axis.yPx * this.canvas.scale
    },
  },
  props: {
    axis: {
      type: Object as () => Position,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
  },
  methods: {},
})
</script>
