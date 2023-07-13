<!-- 軸定義の際のガイド -->
<template>
  <div v-if="axes.canSetX2Y2AtTheSameTime" class="axes-guide">
    <div class="axes-guide_line_1" :style="line1Style"></div>
    <div class="axes-guide_line_2" :style="line2Style"></div>
    <div
      v-if="axes.x1.coordIsFilled"
      class="axes-guide_line_3"
      :style="line3Style"
    ></div>
    <div
      v-if="axes.x1.coordIsFilled"
      class="axes-guide_line_4"
      :style="line4Style"
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
    line1Style() {
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
    line2Style() {
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

    line3Style() {
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
    line4Style() {
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
