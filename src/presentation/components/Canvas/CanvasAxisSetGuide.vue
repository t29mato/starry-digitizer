<template>
  <div v-if="isActive" class="axisSet-guide">
    <div v-if="isX1Y1LineVisible" :style="X1Y1HorizontalLineStyle"></div>
    <div v-if="isX1Y1LineVisible" :style="X1Y1VerticalLineStyle"></div>
    <div v-if="isX2Y2LineVisible" :style="X2Y2HorizontalLineStyle"></div>
    <div v-if="isX2Y2LineVisible" :style="X2Y2VerticalLineStyle"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CSSProperties } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { POINT_MODE } from '@/constants'

const axisSetGuideCommonStyle: CSSProperties = {
  position: 'absolute',
  backgroundColor: '#00ff00',
  opacity: '0.8',
  'pointer-events': 'none',
}

export default defineComponent({
  data() {
    return {
      canvasHandler,
      axisSetRepository,
    }
  },
  methods: {
    //INFO: Implemented as a method instead of computed because computed did not stay reactive
    getImageCanvasSize(): { w: number; h: number } {
      const imageCanvas = document.getElementById('imageCanvas')

      if (!imageCanvas) return { w: 0, h: 0 }

      return { w: imageCanvas.clientWidth, h: imageCanvas.clientHeight }
    },
  },
  computed: {
    isActive(): boolean {
      return (
        this.axisSetRepository.activeAxisSet.pointMode === POINT_MODE.TWO_POINTS
      )
    },
    isX1Y1LineVisible(): boolean {
      // INFO: Always show once the axis is fixed; if not fixed yet, show only while the cursor is on the canvas
      if (this.axisSetRepository.activeAxisSet.x1.coordIsFilled) {
        return true
      }
      return (
        this.canvasHandler.isCursorOnCanvas &&
        this.canvasHandler.scaledCursor.xPx !== 0
      )
    },
    isX2Y2LineVisible(): boolean {
      return this.axisSetRepository.activeAxisSet.x2y2.coordIsFilled
    },
    X1Y1HorizontalLineStyle() {
      const styleTopNum = this.axisSetRepository.activeAxisSet.x1.coordIsFilled
        ? this.axisSetRepository.activeAxisSet.x1.coord.yPx *
          this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.yPx
      return {
        ...axisSetGuideCommonStyle,
        right: '0',
        left: '0',
        width: `${this.getImageCanvasSize().w}px`,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X1Y1VerticalLineStyle(): CSSProperties {
      //INFO: Syncs with the cursor before the axis is fixed, and with the axis after it is fixed
      const styleLeftNum = this.axisSetRepository.activeAxisSet.x1.coordIsFilled
        ? this.axisSetRepository.activeAxisSet.x1.coord.xPx *
          this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.xPx
      return {
        ...axisSetGuideCommonStyle,
        width: '1px',
        height: `${this.getImageCanvasSize().h}px`,
        top: '0',
        bottom: '0',
        left: styleLeftNum + 'px',
      }
    },

    X2Y2HorizontalLineStyle(): CSSProperties {
      //INFO: Syncs with the cursor before the axis is fixed, and with the axis after it is fixed
      const styleTopNum = this.axisSetRepository.activeAxisSet.x2y2
        .coordIsFilled
        ? this.axisSetRepository.activeAxisSet.x2y2.coord.yPx *
          this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.yPx
      return {
        ...axisSetGuideCommonStyle,
        right: '0',
        left: '0',
        width: `${this.getImageCanvasSize().w}px`,
        height: '1px',
        top: styleTopNum + 'px',
      }
    },
    X2Y2VerticalLineStyle(): CSSProperties {
      //INFO: Syncs with the cursor before the axis is fixed, and with the axis after it is fixed
      const styleLeftNum = this.axisSetRepository.activeAxisSet.x2y2
        .coordIsFilled
        ? this.axisSetRepository.activeAxisSet.x2y2.coord.xPx *
          this.canvasHandler.scale
        : this.canvasHandler.scaledCursor.xPx
      return {
        ...axisSetGuideCommonStyle,
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
