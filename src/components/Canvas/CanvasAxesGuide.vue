<!-- 軸定義の際のガイド -->
<template>
  <div v-if="isActive" class="axes-guide">
    <div
      v-if="isX1Y1LineVisible"
      class="axes-guide_line_x1y1_horizontal"
      :style="X1Y1HorizontalLineStyle"
    ></div>
    <div
      v-if="isX1Y1LineVisible"
      class="axes-guide_line_x1y1_vertical"
      :style="X1Y1VerticalLineStyle"
    ></div>
    <div
      v-if="isX2Y2LineVisible"
      class="axes-guide_line_x2y2_horizontal"
      :style="X2Y2HorizontalLineStyle"
    ></div>
    <div
      v-if="isX2Y2LineVisible"
      class="axes-guide_line_x2y2_horizontal"
      :style="X2Y2VerticalLineStyle"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAxesStore } from '@/store/modules/axes'
import { useCanvasStore } from '@/store/modules/canvas'

const axesMapper = useAxesStore()
const canvasMapper = useCanvasStore()

const axesGuideCommonStyle = {
  position: 'absolute',
  backgroundColor: '#00ff00',
  opacity: '0.7',
  pointerEvents: 'none',
}

const isActive = computed(() => axesMapper.axes.value.pointMode === 0)
const isX1Y1LineVisible = computed(
  () =>
    axesMapper.axes.value.x1.coordIsFilled ||
    canvasMapper.canvas.value.scaledCursor.xPx !== 0
)
const isX2Y2LineVisible = computed(
  () => axesMapper.axes.value.x2y2.coordIsFilled
)

const X1Y1HorizontalLineStyle = computed(() => {
  const axes = axesMapper.axes.value
  const canvas = canvasMapper.canvas.value
  const styleTopNum = axes.x1.coordIsFilled
    ? axes.x1.coord.yPx * canvas.scale
    : canvas.scaledCursor.yPx
  return {
    ...axesGuideCommonStyle,
    right: 0,
    left: 0,
    height: '1px',
    top: styleTopNum + 'px',
  }
})

const X1Y1VerticalLineStyle = computed(() => {
  const axes = axesMapper.axes.value
  const canvas = canvasMapper.canvas.value
  const styleLeftNum = axes.x1.coordIsFilled
    ? axes.x1.coord.xPx * canvas.scale
    : canvas.scaledCursor.xPx
  return {
    ...axesGuideCommonStyle,
    width: '1px',
    top: 0,
    bottom: 0,
    left: styleLeftNum + 'px',
  }
})

const X2Y2HorizontalLineStyle = computed(() => {
  const axes = axesMapper.axes.value
  const canvas = canvasMapper.canvas.value
  const styleTopNum = axes.x2y2.coordIsFilled
    ? axes.x2y2.coord.yPx * canvas.scale
    : canvas.scaledCursor.yPx
  return {
    ...axesGuideCommonStyle,
    right: 0,
    left: 0,
    height: '1px',
    top: styleTopNum + 'px',
  }
})

const X2Y2VerticalLineStyle = computed(() => {
  const axes = axesMapper.axes.value
  const canvas = canvasMapper.canvas.value
  const styleLeftNum = axes.x2y2.coordIsFilled
    ? axes.x2y2.coord.xPx * canvas.scale
    : canvas.scaledCursor.xPx
  return {
    ...axesGuideCommonStyle,
    width: '1px',
    top: 0,
    bottom: 0,
    left: styleLeftNum + 'px',
  }
})
</script>
