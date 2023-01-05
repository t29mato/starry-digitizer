<template>
  <div style="border: '1px solid red'">
    <div
      :style="{
        position: 'absolute',
        top: `${(yPx - axisHalfSizePx) * magnifier.scale}px`,
        left: `${(xPx - axisCrossBorderHalfPx) * magnifier.scale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifier.scale}) translate(-${
          canvas.cursor.xPx - magnifierHalfSizePx / magnifier.scale
        }px, -${canvas.cursor.yPx - magnifierHalfSizePx / magnifier.scale}px)`,
        'transform-origin': 'top left',
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
      >
        <div v-if="axis.name.includes('x')">
          <magnifier-axis-label-x :label="axis.name" />
        </div>
        <div v-if="axis.name.includes('y')">
          <magnifier-axis-label-y :label="axis.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { AxisInterface } from '@/domains/axes/axisInterface'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { styleMapper } from '@/store/modules/style'
import MagnifierAxisLabelX from './MagnifierAxisLabelX.vue'
import MagnifierAxisLabelY from './MagnifierAxisLabelY.vue'
import Vue from 'vue'
export default Vue.extend({
  components: {
    MagnifierAxisLabelX,
    MagnifierAxisLabelY,
  },
  data() {
    return {}
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    ...styleMapper.mapGetters([
      'axisSizePx',
      'axisHalfSizePx',
      'axisCrossBorderHalfPx',
      'axisCrossBorderPx',
      'axisCrossTopPx',
      'axisCrossCursorPx',
    ]),
    ...magnifierMapper.mapGetters(['magnifier']),
    xPx(): number {
      return this.axis.coord.xPx
    },
    yPx(): number {
      return this.axis.coord.yPx
    },
    magnifierHalfSizePx(): number {
      return this.magnifier.sizePx / 2
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
