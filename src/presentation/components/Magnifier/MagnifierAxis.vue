<template>
  <div style="border: '1px solid red'">
    <div
      :style="{
        position: 'absolute',
        top: `${(yPx - axisHalfSizePx) * magnifier.scale}px`,
        left: `${(xPx - axisCrossBorderHalfPx) * magnifier.scale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvasHandler.cursor.xPx - magnifierHalfSizePx / magnifier.scale
        }px, -${
          canvasHandler.cursor.yPx - magnifierHalfSizePx / magnifier.scale
        }px)`,
        'transform-origin': 'top left',
        width: `${axisCrossBorderPx}px`,
        height: `${axisSizePx}px`,
        background: isActive ? 'red' : 'dodgerblue',
        opacity: axisOpacity,
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
      >
        <div v-if="axis.name.includes('x') && axis.name !== 'x2y2'">
          <magnifier-axis-label-x :label="axis.name" />
        </div>
        <div v-if="axis.name.includes('y') && axis.name !== 'x2y2'">
          <magnifier-axis-label-y :label="axis.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { AxisInterface } from '@/domain/models/axis/axisInterface'
import MagnifierAxisLabelX from './MagnifierAxisLabelX.vue'
import MagnifierAxisLabelY from './MagnifierAxisLabelY.vue'
import { defineComponent } from 'vue'

import { magnifier } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { STYLE } from '@/constants/constants'

export default defineComponent({
  components: {
    MagnifierAxisLabelX,
    MagnifierAxisLabelY,
  },
  data() {
    return {
      magnifier,
      canvasHandler,
      axisSizePx: STYLE.axisSizePx,
      axisOpacity: STYLE.axisOpacity,
    }
  },
  computed: {
    xPx(): number {
      return this.axis.coord.xPx
    },
    yPx(): number {
      return this.axis.coord.yPx
    },
    magnifierHalfSizePx(): number {
      return this.magnifier.sizePx / 2
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
  },
  props: {
    axis: {
      type: Object as () => AxisInterface,
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
