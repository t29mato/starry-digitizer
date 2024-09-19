<template>
  <div>
    <!-- INFO: right label -->
    <div
      v-if="
        !(
          axisSetRepository.activeAxisSet.isAdjusting ||
          datasetRepository.activeDataset.pointsAreAdjusting
        )
      "
      :style="{
        position: 'absolute',
        top: `${canvasHandler.scaledCursor.yPx - axisCrossCursorPx}px`,
        left: `${canvasHandler.scaledCursor.xPx + axisCrossCursorPx}px`,
        'pointer-events': 'none',
      }"
    >
      {{ rightLabel }}
    </div>
    <!-- INFO: bottom label -->
    <div
      v-if="!axisSetRepository.activeAxisSet.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${canvasHandler.scaledCursor.yPx + axisCrossCursorPx / 2}px`,
        left: `${canvasHandler.scaledCursor.xPx - axisCrossCursorPx / 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ bottomLabel }}
    </div>
    <!-- INFO: left label -->
    <div
      v-if="!axisSetRepository.activeAxisSet.isAdjusting"
      :style="{
        position: 'absolute',
        top: `${canvasHandler.scaledCursor.yPx - axisCrossCursorPx}px`,
        left: `${canvasHandler.scaledCursor.xPx - axisCrossCursorPx * 2}px`,
        'pointer-events': 'none',
      }"
    >
      {{ leftLabel }}
    </div>
    <div v-if="isCursorGuideLinesActive">
      <!-- INFO: Horizontal Guide Line -->
      <div :style="horizontalGuideLineStyle"></div>
      <!-- INFO: Vertical Guide Line -->
      <div :style="verticalGuideLineStyle"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CSSProperties } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { MANUAL_MODE, POINT_MODE, STYLE } from '@/constants'

const guideLineBaseStyles: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  opacity: '0.8',
}

export default defineComponent({
  data() {
    return {
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      axisSizePx: STYLE.AXIS_SIZE_PX,
    }
  },
  computed: {
    axisHalfSizePx(): number {
      return this.axisSizePx / 2
    },
    axisCrossCursorPx(): number {
      return this.axisSizePx * 0.7
    },
    rightLabel(): string {
      switch (this.canvasHandler.maskMode) {
        case 0:
          return 'Pen'
        case 1:
          return 'Box'
        case 2:
          return 'Eraser'
      }
      switch (this.canvasHandler.manualMode) {
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
      if (this.axisSetRepository.activeAxisSet.nextAxis?.name === 'x2y2') {
        return "x2'"
      }
      if (this.axisSetRepository.activeAxisSet.nextAxis?.name.includes('x')) {
        return this.axisSetRepository.activeAxisSet.nextAxis.name
      }
      return ''
    },
    leftLabel(): string {
      if (this.axisSetRepository.activeAxisSet.nextAxis?.name === 'x2y2') {
        return "y2'"
      }
      if (this.axisSetRepository.activeAxisSet.nextAxis?.name.includes('y')) {
        return this.axisSetRepository.activeAxisSet.nextAxis.name
      }
      if (
        this.axisSetRepository.activeAxisSet.nextAxis?.name === 'x1' &&
        this.axisSetRepository.activeAxisSet.pointMode === POINT_MODE.TWO_POINTS
      ) {
        return 'y1'
      }

      return ''
    },
    isCursorGuideLinesActive(): boolean {
      //INFO: 軸定義後でプロットのいずれのモードでもないときは表示しない
      if (
        this.canvasHandler.manualMode === MANUAL_MODE.UNSET &&
        this.axisSetRepository.activeAxisSet.y2.coordIsFilled
      ) {
        return false
      }

      // //INFO: マスク操作中の場合は表示しない
      if (this.canvasHandler.maskMode !== -1) {
        return false
      }

      //INFO: EDIT, DELETEモードの場合は表示しない
      if (
        this.canvasHandler.manualMode !== MANUAL_MODE.UNSET &&
        this.canvasHandler.manualMode !== MANUAL_MODE.ADD
      ) {
        return false
      }

      return true
    },
    guideLineColor(): string {
      if (this.canvasHandler.manualMode === MANUAL_MODE.UNSET) {
        return '#00ff00'
      }

      if (this.canvasHandler.manualMode === MANUAL_MODE.ADD) {
        return '#ffcc00'
      }

      return '#00ff00'
    },
    horizontalGuideLineStyle(): CSSProperties {
      return {
        ...guideLineBaseStyles,
        width: `${this.getImageCanvasSize().w}px`,
        height: '1px',
        top: `${this.canvasHandler.scaledCursor.yPx}px`,
        backgroundColor: this.guideLineColor,
      }
    },
    verticalGuideLineStyle(): CSSProperties {
      return {
        ...guideLineBaseStyles,
        width: '1px',
        top: '0',
        height: `${this.getImageCanvasSize().h}px`,
        left: `${this.canvasHandler.scaledCursor.xPx}px`,
        backgroundColor: this.guideLineColor,
      }
    },
  },
  methods: {
    //INFO: computedではリアクティブにならなかったのでmethodとしている
    getImageCanvasSize(): { w: number; h: number } {
      const imageCanvas = document.getElementById('imageCanvas')

      if (!imageCanvas) return { w: 0, h: 0 }

      return { w: imageCanvas.clientWidth, h: imageCanvas.clientHeight }
    },
  },
})
</script>
