<template>
  <div v-if="isActive" class="axes-guide">
    <div v-if="isX1Y1LineVisible" :style="X1Y1HorizontalLineStyle"></div>
    <div v-if="isX1Y1LineVisible" :style="X1Y1VerticalLineStyle"></div>
    <div v-if="isX2Y2LineVisible" :style="X2Y2HorizontalLineStyle"></div>
    <div v-if="isX2Y2LineVisible" :style="X2Y2VerticalLineStyle"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CSSProperties } from 'vue'

import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'

const axesGuideCommonStyle: CSSProperties = {
  position: 'absolute',
  backgroundColor: '#00ff00',
  opacity: '0.8',
  'pointer-events': 'none',
}

export default defineComponent({
  data() {
    return {
      canvasHandler: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
    }
  },
  methods: {
    //INFO: computedではリアクティブにならなかったのでmethodとしている
    getImageCanvasSize(): { w: number; h: number } {
      const imageCanvas = document.getElementById('imageCanvas')

      if (!imageCanvas) return { w: 0, h: 0 }

      return { w: imageCanvas.clientWidth, h: imageCanvas.clientHeight }
    },
  },
  computed: {
    isActive(): boolean {
      return this.axes.pointMode === 0
    },
    isX1Y1LineVisible(): boolean {
      return (
        this.axes.x1.coordIsFilled || this.canvasHandler.scaledCursor.xPx !== 0
      )
    },
    isX2Y2LineVisible(): boolean {
      return this.axes.x2y2.coordIsFilled
    },
    X1Y1HorizontalLineStyle() {
      const styleTopNum = this.axes.x1.coordIsFilled
        ? this.axes.x1.coord.yPx * this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.yPx
      return {
        ...axesGuideCommonStyle,
        right: '0',
        left: '0',
        width: `${this.getImageCanvasSize().w}px`,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X1Y1VerticalLineStyle(): CSSProperties {
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
      const styleLeftNum = this.axes.x1.coordIsFilled
        ? this.axes.x1.coord.xPx * this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.xPx
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        height: `${this.getImageCanvasSize().h}px`,
        top: '0',
        bottom: '0',
        left: styleLeftNum + 'px',
      }
    },

    X2Y2HorizontalLineStyle(): CSSProperties {
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
      const styleTopNum = this.axes.x2y2.coordIsFilled
        ? this.axes.x2y2.coord.yPx * this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.yPx
      return {
        ...axesGuideCommonStyle,
        right: '0',
        left: '0',
        width: `${this.getImageCanvasSize().w}px`,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X2Y2VerticalLineStyle(): CSSProperties {
      //INFO: 軸決定前はカーソルに同期し、軸決定後は軸に同期する
      const styleLeftNum = this.axes.x2y2.coordIsFilled
        ? this.axes.x2y2.coord.xPx * this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.xPx
      return {
        ...axesGuideCommonStyle,
        width: '1px',
        height: `${this.getImageCanvasSize().h}px`,
        top: '0',
        bottom: '0',
        left: styleLeftNum + 'px',
      }
    },
  },
})
</script>
