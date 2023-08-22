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

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'
import { useStyleStore } from '@/store/modules/style'
import { AxisInterface } from '@/domains/axes/axisInterface'

const props = defineProps({
  axis: {
    type: Object as () => AxisInterface,
    required: true,
  },
})

const axesStore = useAxesStore()
const canvasStore = useCanvasStore()
const styleStore = useStyleStore()

const fontSize = ref(14)

const axisSizePx = computed(() => styleStore.axisSizePx.value)
const axisHalfSizePx = computed(() => styleStore.axisHalfSizePx.value)
const axisCrossBorderHalfPx = computed(
  () => styleStore.axisCrossBorderHalfPx.value
)
const axisCrossBorderPx = computed(() => styleStore.axisCrossBorderPx.value)
const axisCrossTopPx = computed(() => styleStore.axisCrossTopPx.value)
const axisCrossCursorPx = computed(() => styleStore.axisCrossCursorPx.value)
const canvas = computed(() => canvasStore.canvas.value)
const axes = computed(() => axesStore.axes.value)

const xPx = computed(() => {
  if (props.axis.coord) {
    return props.axis.coord.xPx * canvas.value.scale
  }
  return -999
})

const yPx = computed(() => {
  if (props.axis.coord) {
    return props.axis.coord.yPx * canvas.value.scale
  }
  return -999
})

const labelLeft = computed(() => {
  if (props.axis.name.includes('x')) {
    return xPx.value - axisCrossCursorPx.value / 2
  } else if (props.axis.name.includes('y')) {
    return xPx.value - axisCrossCursorPx.value * 2
  } else {
    return 0
  }
})

const labelTop = computed(() => {
  if (props.axis.name.includes('x')) {
    return yPx.value + axisCrossCursorPx.value / 2
  } else if (props.axis.name.includes('y')) {
    return yPx.value - axisCrossCursorPx.value
  } else {
    return 0
  }
})

const isActive = computed(() => {
  if (
    axes.value.pointMode === 0 &&
    axes.value.activeAxisName === 'x1' &&
    props.axis.name === 'y1'
  ) {
    return true
  }

  return axes.value.activeAxisName === props.axis.name
})
</script>
