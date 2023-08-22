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
import { AxisInterface } from '@/domains/axes/axisInterface'
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'
import { useMagnifierStore } from '@/store/modules/magnifier'
import { useStyleStore } from '@/store/modules/style'
import MagnifierAxisLabelX from './MagnifierAxisLabelX.vue'
import MagnifierAxisLabelY from './MagnifierAxisLabelY.vue'
import { computed } from 'vue'
export default {
  components: {
    MagnifierAxisLabelX,
    MagnifierAxisLabelY,
  },
  // @ts-ignore
  setup(props: any) {
    const {
      axisSizePx,
      axisHalfSizePx,
      axisCrossBorderHalfPx,
      axisCrossBorderPx,
      axisCrossTopPx,
      axisCrossCursorPx,
    } = useStyleStore()
    const { canvas } = useCanvasStore()
    const { axes } = useAxesStore()
    const { magnifier } = useMagnifierStore()
    const xPx = computed(() => {
      return props.axis.coord.xPx
    })
    const yPx = computed(() => {
      return props.axis.coord.yPx
    })
    const magnifierHalfSizePx = computed(() => {
      return magnifier.value.sizePx / 2
    })

    return {
      canvas,
      axes,
      magnifier,
      axisSizePx,
      axisHalfSizePx,
      axisCrossBorderHalfPx,
      axisCrossBorderPx,
      axisCrossTopPx,
      axisCrossCursorPx,
      xPx,
      yPx,
      magnifierHalfSizePx,
    }
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
}
</script>
