<template>
  <div>
    <!-- INFO: right label -->
    <div
      v-if="
        !(
          axisRepository.isAdjusting ||
          datasetRepository.activeDataset.plotsAreAdjusting
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
      v-if="!axisRepository.isAdjusting"
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
      v-if="!axisRepository.isAdjusting"
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

import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { axisRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { STYLE } from '@/constants/constants'

const guideLineBaseStyles: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  opacity: '0.8',
}

export default defineComponent({
  data() {
    return {
      canvasHandler: CanvasHandler.getInstance(),
      axisRepository,
      datasetRepository,
      axisSizePx: STYLE.axisSizePx,
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
      if (this.axisRepository.nextAxis?.name === 'x2y2') {
        return "x2'"
      }
      if (this.axisRepository.nextAxis?.name.includes('x')) {
        return this.axisRepository.nextAxis.name
      }
      return ''
    },
    leftLabel(): string {
      if (this.axisRepository.nextAxis?.name === 'x2y2') {
        return "y2'"
      }
      if (this.axisRepository.nextAxis?.name.includes('y')) {
        return this.axisRepository.nextAxis.name
      }
      if (
        this.axisRepository.nextAxis?.name === 'x1' &&
        this.axisRepository.pointMode === 0
      ) {
        return 'y1'
      }

      return ''
    },
    isCursorGuideLinesActive(): boolean {
      //INFO: 軸定義後でプロットのいずれのモードでもないときは表示しない
      if (
        this.canvasHandler.manualMode === -1 &&
        this.axisRepository.y2.coordIsFilled
      ) {
        return false
      }

      // //INFO: マスク操作中の場合は表示しない
      if (this.canvasHandler.maskMode !== -1) {
        return false
      }

      //INFO: EDIT, DELETEモードの場合は表示しない
      if (
        this.canvasHandler.manualMode !== -1 &&
        this.canvasHandler.manualMode !== 0
      ) {
        return false
      }

      return true
    },
    guideLineColor(): string {
      if (this.canvasHandler.manualMode === -1) {
        return '#00ff00'
      }

      if (this.canvasHandler.manualMode === 0) {
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
