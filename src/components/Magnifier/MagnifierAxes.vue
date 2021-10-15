<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((axis.yPx - axesHalfSize) / canvasScale) * magnifierScale}px`,
        left: `${((axis.xPx - axesHalfSize) / canvasScale) * magnifierScale}px`,
        'pointer-events': 'none',
        transform: `scale(${magnifierScale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierHalfSize / magnifierScale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierHalfSize / magnifierScale
        }px)`,
        'transform-origin': 'top left',
        width: `${axesSize / canvasScale}px`,
        height: `${axesSize / canvasScale}px`,
        'border-radius': '50%',
        'background-color': color,
        outline: '1px solid white',
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((axis.yPx - axesHalfSize - axesSize) / canvasScale - 3) *
          magnifierScale
        }px`,
        left: `${
          ((axis.xPx - axesHalfSize + axesSize) / canvasScale + 3) *
          magnifierScale
        }px`,
        'pointer-events': 'none',
        transform: `scale(${magnifierScale}) translate(-${
          canvasCursor.xPx / canvasScale - magnifierHalfSize / magnifierScale
        }px, -${
          canvasCursor.yPx / canvasScale - magnifierHalfSize / magnifierScale
        }px)`,
        'transform-origin': 'top left',
      }"
      >{{ label }}</span
    >
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  computed: {
    axesHalfSize(): number {
      return this.axesSize / 2
    },
    magnifierHalfSize(): number {
      return this.magnifierSize / 2
    },
  },
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
    label: {
      type: String,
      required: true,
    },
  },
})
</script>
