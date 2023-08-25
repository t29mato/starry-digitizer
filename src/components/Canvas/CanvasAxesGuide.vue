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
      class="axes-guide_line_x2y2_vertical"
      :style="X2Y2VerticalLineStyle"
    ></div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'

const axesGuideCommonStyle = {
  position: 'absolute',
  backgroundColor: '#00ff00',
  opacity: '0.7',
  pointerEvents: 'none',
}

export default Vue.extend({
  components: {},
  computed: {
    ...mapGetters('axes', { axes: 'axes' }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
    isActive() {
      return this.axes.pointMode === 0
    },
    isX1Y1LineVisible() {
      return this.axes.x1.coordIsFilled || this.canvas.scaledCursor.xPx !== 0
    },
    isX2Y2LineVisible() {
      return this.axes.x2y2.coordIsFilled
    },
    X1Y1HorizontalLineStyle() {
      const styleTopNum = this.axes.x1.coordIsFilled
        ? this.axes.x1.coord.yPx * this.canvas.scale
        : this.canvas.scaledCursor.yPx
      return {
        ...axesGuideCommonStyle,
        right: 0,
        left: 0,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X1Y1VerticalLineStyle() {
      const styleLeftNum = this.axes.x1.coordIsFilled
        ? this.axes.x1.coord.xPx * this.canvas.scale
        : this.canvas.scaledCursor.xPx
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        top: 0,
        bottom: 0,
        left: styleLeftNum + 'px',
      }
    },

    X2Y2HorizontalLineStyle() {
      const styleTopNum = this.axes.x2y2.coordIsFilled
        ? this.axes.x2y2.coord.yPx * this.canvas.scale
        : this.canvas.scaledCursor.yPx
      return {
        ...axesGuideCommonStyle,
        right: 0,
        left: 0,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X2Y2VerticalLineStyle() {
      const styleLeftNum = this.axes.x2y2.coordIsFilled
        ? this.axes.x2y2.coord.xPx * this.canvas.scale
        : this.canvas.scaledCursor.xPx
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        top: 0,
        bottom: 0,
        left: styleLeftNum + 'px',
      }
    },
  },
  props: {},
  methods: {},
})
</script>
