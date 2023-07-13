<!-- 軸定義の際のガイド -->
<template>
  <div v-if="axes.canSetX2Y2AtTheSameTime" class="axes-guide">
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

<script lang="ts">
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'

const axesGuideCommonStyle = {
  position: 'absolute',
  backgroundColor: '#00ff00',
  opacity: '0.7',
  pointerEvents: 'none',
}

import Vue from 'vue'
export default Vue.extend({
  components: {},
  computed: {
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
    isX1Y1LineVisible() {
      return this.axes.x1.coordIsFilled || this.canvas.scaledCursor.xPx !== 0
    },
    isX2Y2LineVisible() {
      return this.axes.x1.coordIsFilled
    },
    X1Y1HorizontalLineStyle() {
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
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
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
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
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
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
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
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
