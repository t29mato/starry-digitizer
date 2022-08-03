<template>
  <div>
    <div
      :style="{
        position: 'absolute',
        top: `${((yPx - axesHalfSize) / canvasScale) * magnifierScale}px`,
        left: `${((xPx - axesHalfSize) / canvasScale) * magnifierScale}px`,
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
        'background-color': isActive ? 'red' : 'dodgerblue',
        outline: `${1 / canvasScale}px solid white`,
      }"
    ></div>
    <span
      :style="{
        position: 'absolute',
        top: `${
          ((yPx - axesHalfSize - axesSize) / canvasScale - 3) * magnifierScale
        }px`,
        left: `${
          ((xPx - axesHalfSize + axesSize) / canvasScale + 3) * magnifierScale
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
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...canvasMapper.mapGetters(['canvasScale']),
    ...axesMapper.mapGetters(['axes']),
    axesHalfSize(): number {
      return this.axesSize / 2
    },
    magnifierHalfSize(): number {
      return this.magnifierSize / 2
    },
    xPx(): number {
      return this.axis.xPx
    },
    yPx(): number {
      return this.axis.yPx
    },
  },
  props: {
    axis: {
      type: Object as () => {
        xPx: number
        yPx: number
      },
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
    },
    axesSize: {
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
