<template>
  <div>
    <!-- INFO: right label -->
    <div
      v-if="!(axes.isAdjusting || datasets.activeDataset.plotsAreAdjusting)"
      :style="{
        position: 'absolute',
        top: `${this.canvas.scaledCursor.yPx - this.axisCrossCursorPx}px`,
        left: `${this.canvas.scaledCursor.xPx + this.axisCrossCursorPx}px`,
        'pointer-events': 'none',
      }"
    >
      {{ rightLabel }}
    </div>
    <!-- INFO: bottom label -->
    <div
      v-if="!axes.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${this.canvas.scaledCursor.yPx + this.axisCrossCursorPx / 2}px`,
        left: `${this.canvas.scaledCursor.xPx - this.axisCrossCursorPx / 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ bottomLabel }}
    </div>
    <!-- INFO: left label -->
    <div
      v-if="!axes.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${this.canvas.scaledCursor.yPx - this.axisCrossCursorPx}px`,
        left: `${this.canvas.scaledCursor.xPx - this.axisCrossCursorPx * 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ leftLabel }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'

export default Vue.extend({
  props: {},
  computed: {
    ...mapGetters('style', {
      axisCrossCursorPx: 'axisCrossCursorPx',
      axisHalfSizePx: 'axisHalfSizePx',
    }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
    ...mapGetters('axes', { axes: 'axes' }),
    ...mapGetters('dataset', { dataset: 'dataset' }),
    rightLabel(): string {
      switch (this.canvas.maskMode) {
        case 0:
          return 'Pen'
        case 1:
          return 'Box'
        case 2:
          return 'Eraser'
      }
      switch (this.canvas.manualMode) {
        case 0:
          return 'Add'
        case 1:
          return 'Edit'
        case 2:
          return 'Delete'
      }
      return ''
    },
    bottomLabel(): string {
      if (this.axes.nextAxis?.name === 'x2y2') {
        return "x2'"
      }
      if (this.axes.nextAxis?.name.includes('x')) {
        return this.axes.nextAxis.name
      }
      return ''
    },
    leftLabel(): string {
      if (this.axes.nextAxis?.name === 'x2y2') {
        return "y2'"
      }
      if (this.axes.nextAxis?.name.includes('y')) {
        return this.axes.nextAxis.name
      }
      if (this.axes.nextAxis?.name === 'x1' && this.axes.pointMode === 0) {
        return 'y1'
      }

      return ''
    },
  },
})
</script>
