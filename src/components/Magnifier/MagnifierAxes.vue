<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((axis.yPx - axesSize / 2) / canvasScale) * magnifierScale}px`,
        left: `${((axis.xPx - axesSize / 2) / canvasScale) * magnifierScale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifierScale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierSize / 2 / magnifierScale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierSize / 2 / magnifierScale
        }px)`,
        'transform-origin': 'top left',
        width: `${axesSize / canvasScale}px`,
        height: `${axesSize / canvasScale}px`,
        'border-radius': '50%',
        'background-color': color,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((axis.yPx - axesSize / 2 - axesSize) / canvasScale) * magnifierScale
        }px`,
        left: `${
          ((axis.xPx - axesSize / 2 + axesSize) / canvasScale) * magnifierScale
        }px`,
        'pointer-events': 'none',
        transform: `scale(${magnifierScale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierSize / 2 / magnifierScale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierSize / 2 / magnifierScale
        }px)`,
        'transform-origin': 'top left',
      }"
      >{{ showAxisName(index) }}</span
    >
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    axis: {
      type: Object as () => {
        xPx: Number
        yPx: Number
      },
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    axesSize: {
      type: Number,
      required: true,
    },
    canvasScale: {
      type: Number,
      required: true,
    },
    canvasCursor: {
      type: Object as () => {
        xPx: Number
        yPx: Number
      },
      required: true,
    },
    magnifierScale: {
      type: Number,
      required: true,
    },
    magnifierSize: {
      type: Number,
      required: true,
    },
  },
  methods: {
    showAxisName(index: number): string {
      switch (index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          return '-'
      }
    },
  },
})
</script>
