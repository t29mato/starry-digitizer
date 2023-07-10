<!-- 軸定義の際のガイド -->
<template>
  <div class="axes-guide">
    <div
      v-if="axes.canSetX2Y2AtTheSameTime && axes.x1.coord"
      class="axes-guide_line_1"
      :style="line1Style"
    ></div>
    <div
      v-if="axes.canSetX2Y2AtTheSameTime && axes.x2y2.coord"
      class="axes-guide_line_2"
      :style="line2Style"
    ></div>
    <div
      v-if="axes.canSetX2Y2AtTheSameTime && axes.x1.coord"
      class="axes-guide_line_3"
      :style="line3Style"
    ></div>
    <div
      v-if="axes.canSetX2Y2AtTheSameTime && axes.x2y2.coord"
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
    //x=yでありconsider graph tiltでない時のみ有効化する
    //order: top, right, left, bottom
    line1Style() {
      return {
        ...axesGuideCommonStyle,
        right: 0,
        left: 0,
        height: '1px',
        top: this.axes.x1.coord.yPx * this.canvas.scale + 'px',
      }
    },
    line2Style() {
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        top: 0,
        bottom: 0,
        left: this.axes.x2y2.coord.xPx * this.canvas.scale + 'px',
      }
    },
    line3Style() {
      return {
        ...axesGuideCommonStyle,
        right: 0,
        left: 0,
        height: '1px',
        top: this.axes.x2y2.coord.yPx * this.canvas.scale + 'px',
      }
    },
    line4Style() {
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        top: 0,
        bottom: 0,
        left: this.axes.x1.coord.xPx * this.canvas.scale + 'px',
      }
    },
  },
  props: {},
  methods: {},
})
</script>
