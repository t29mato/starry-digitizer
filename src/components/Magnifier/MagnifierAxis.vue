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
        <!-- TODO: magic numberは除外する -->
        <div v-if="axis.name.includes('x')" :style="{}">
          <div
            :style="{
              position: 'absolute',
              left: `${5}px`,
              top: `${10}px`,
            }"
          >
            {{ axis.name }}
          </div>
        </div>
        <div v-if="axis.name.includes('y')" :style="{}">
          <div
            :style="{
              position: 'absolute',
              left: `${-15}px`,
              top: `${-10}px`,
            }"
          >
            {{ axis.name }}
          </div>
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
import Vue from 'vue'
export default Vue.extend({
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
    label(): string {
      if (!this.axes.x1IsSameAsY1) {
        return this.axis.name
      }
      if (this.axis.name === 'x1') {
        return 'x1 y1'
      }
      if (this.axis.name === 'y1') {
        return ''
      }
      return this.axis.name
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
