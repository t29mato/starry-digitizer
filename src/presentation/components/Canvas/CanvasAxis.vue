<template>
  <div v-if="axis.coordIsFilled" v-show="isVisible">
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
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { AxisInterface } from '@/domain/models/axis/axisInterface'
import { axisRepository } from '@/instanceStore/repositoryInatances'
import { STYLE } from '@/constants/constants'

export default defineComponent({
  props: {
    axis: {
      type: Object as () => AxisInterface,
      required: true,
    },
    isVisible: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      fontSize: 14,
      canvasHandler,
      axisRepository,
      axisSizePx: STYLE.axisSizePx,
    }
  },
  computed: {
    xPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.xPx * this.canvasHandler.scale
      }
      return -999
    },
    yPx(): number {
      if (this.axis.coord) {
        return this.axis.coord.yPx * this.canvasHandler.scale
      }
      return -999
    },
    axisHalfSizePx(): number {
      return this.axisSizePx / 2
    },
    axisCrossBorderPx(): number {
      return this.axisSizePx * 0.1
    },
    axisCrossBorderHalfPx(): number {
      return this.axisCrossBorderPx * 0.5
    },
    axisCrossTopPx(): number {
      return (this.axisSizePx - this.axisCrossBorderPx) / 2
    },
    axisCrossCursorPx(): number {
      return this.axisSizePx * 0.7
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
        this.axisRepository.pointMode === 0 &&
        this.axisRepository.activeAxisName === 'x1' &&
        this.axis.name === 'y1'
      ) {
        return true
      }

      return this.axisRepository.activeAxisName === this.axis.name
    },
  },
  methods: {},
})
</script>
