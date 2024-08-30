<template>
  <div
    id="canvasWrapper"
    class="c__canvas-wrapper"
    @click="click"
    @mousemove="mouseMove"
    @mousedown="mouseDown"
    @mouseup="mouseUp"
  >
    <canvas id="imageCanvas"></canvas>
    <canvas
      id="tempMaskCanvas"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
    ></canvas>
    <canvas
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
      id="maskCanvas"
    ></canvas>
    <canvas
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
      id="interpolationGuideCanvas"
    ></canvas>
    <canvas-axis-set-guide></canvas-axis-set-guide>
    <canvas-axis-set></canvas-axis-set>
    <canvas-plots></canvas-plots>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CanvasAxisSet, CanvasPlots, CanvasCursor, CanvasAxisSetGuide } from '.'
import { Vector } from '@/domain/models/AxisSet/AxisSetInterface'
import { Coord, Plot } from '@/domain/models/dataset/datasetInterface'

import { getMouseCoordFromMouseEvent } from '@/presentation/utils/mouseEventUtilities'
import { getRectCoordsFromDragCoords } from '@/presentation/utils/dragRectangleCalculator'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { confirmer } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { AxisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

export default defineComponent({
  components: {
    CanvasAxisSet,
    CanvasPlots,
    CanvasCursor,
    CanvasAxisSetGuide,
  },
  props: {
    imagePath: String,
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  data() {
    return {
      interpolator,
      confirmer,
      extractor,
      canvasHandler,
      axisSetRepository: AxisSetRepository,
      datasetRepository,
    }
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler.bind(this))

    this.interpolator.setGuideCanvas(new HTMLCanvas('interpolationGuideCanvas'))

    if (!this.imagePath) {
      return
    }
    try {
      await this.canvasHandler.initializeImageElement(this.imagePath)
      this.canvasHandler.drawFitSizeImage()
      this.canvasHandler.setUploadImageUrl(this.imagePath)
      this.extractor.setSwatches(this.canvasHandler.colorSwatches)

      //TODO: interpolation canvasをinterpolator appに移譲したのでここで呼んでいるがcanvas初期化一連を行うapplicationにまとめたい
      this.interpolator.resizeCanvas()
    } finally {
      //
    }
  },
  methods: {
    // REFACTOR: modeに応じてplotなりpickColorなりを呼び出す形に変更する
    plot(e: MouseEvent): void {
      // IFNO: マスク描画モード中につき
      if (this.canvasHandler.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPlot = target.className === 'canvas-plot'
      // INFO: canvas-plot element上の時は、plot edit modeになるので
      switch (this.canvasHandler.manualMode) {
        case 0:
          this.datasetRepository.activeDataset.addPlot(
            isOnCanvasPlot
              ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
                  this.canvasHandler.scale
              : (e.offsetX - offsetPx) / this.canvasHandler.scale,
            isOnCanvasPlot
              ? (e.offsetY + parseFloat(target.style.top)) /
                  this.canvasHandler.scale
              : e.offsetY / this.canvasHandler.scale,
          )
          this.axisSetRepository.activeAxisSet.inactivateAxis()
          this.datasetRepository.activeDataset.addManuallyAddedPlotId(
            this.datasetRepository.activeDataset.lastPlotId,
          )
          return
        case 1:
          // INFO: CanvasPlot Component -> Click method
          return
        case 2:
          // INFO: CanvasPlot Component -> Click method
          return
        default:
          break
      }
      if (isOnCanvasPlot) {
        return
      }
      if (this.axisSetRepository.activeAxisSet.nextAxis) {
        this.axisSetRepository.activeAxisSet.addAxisCoord({
          xPx: (e.offsetX - offsetPx) / this.canvasHandler.scale,
          yPx: e.offsetY / this.canvasHandler.scale,
        })
        this.datasetRepository.activeDataset.inactivatePlots()
        // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
        if (!this.axisSetRepository.activeAxisSet.nextAxis) {
          this.canvasHandler.manualMode = 0
        }
        return
      }
    },
    click(e: MouseEvent): void {
      if (this.confirmer.isActive) return

      this.plot(e)

      if (this.interpolator.isActive) {
        this.interpolator.updatePreview()
      }
    },
    mouseDrag(coord: Coord) {
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseDrag(coord.xPx, coord.yPx)
    },
    mouseMove(e: MouseEvent) {
      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.axisSetRepository.activeAxisSet.isAdjusting = false
      this.datasetRepository.activeDataset.plotsAreAdjusting = false
      this.canvasHandler.setCursor({
        xPx: xPx / this.canvasHandler.scale,
        yPx: yPx / this.canvasHandler.scale,
      })
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (isClicking) {
        this.mouseDrag({ xPx, yPx })
      }
    },
    mouseDown(e: MouseEvent) {
      if (this.confirmer.isActive) return

      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.canvasHandler.mouseDown(xPx, yPx)
    },
    mouseUp() {
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseUp()

      // INFO: EDITモードの場合にplotの複数選択を行う
      if (this.canvasHandler.manualMode === 1) {
        const rect = this.canvasHandler.rectangle
        const scale = this.canvasHandler.scale

        const { topLeftCoord, bottomRightCoord } = getRectCoordsFromDragCoords(
          { xPx: rect.startX / scale, yPx: rect.startY / scale },
          { xPx: rect.endX / scale, yPx: rect.endY / scale },
        )

        this.datasetRepository.activeDataset.activatePlotsInRectangleArea(
          topLeftCoord,
          bottomRightCoord,
        )

        return
      }
    },
    keyDownHandler(e: KeyboardEvent) {
      if (this.confirmer.isActive) return

      const target = e.target as Element
      // INFO: 編集可能HTMLにカーソルが当たってる場合はスルー
      if (target.hasAttribute('contentEditable')) {
        return
      }
      // INFO: 入力フィールドにカーソルが当たってる場合はスルー
      const targetName = target.nodeName
      if (targetName === 'INPUT' || targetName === 'TEXTAREA') {
        return
      }
      const whiteList = [
        'ArrowUp',
        'ArrowRight',
        'ArrowDown',
        'ArrowLeft',
        'Backspace',
        'Delete',
        'a',
        'e',
        'd',
      ]
      const key = e.key
      if (!whiteList.includes(key)) {
        return
      }
      e.preventDefault()
      switch (key) {
        case 'a':
          this.canvasHandler.setManualMode(0)
          return
        case 'e':
          this.canvasHandler.setManualMode(1)
          return
        case 'd':
          this.canvasHandler.setManualMode(2)
          return
      }
      if (
        this.datasetRepository.activeDataset.hasActive() &&
        (key === 'Backspace' || key === 'Delete')
      ) {
        this.datasetRepository.activeDataset.clearActivePlots()

        if (this.interpolator.isActive) {
          this.interpolator.updatePreview()
        }

        const lastPlotId = this.datasetRepository.activeDataset.lastPlotId

        if (lastPlotId !== -1) {
          this.datasetRepository.activeDataset.switchActivatedPlot(lastPlotId)
        }

        return
      }
      const shiftKeyIsPressed = e.shiftKey
      const vector: Vector = {
        direction: this.getDirectionFromKey(key),
        distancePx: shiftKeyIsPressed ? 10 : 1,
      }
      if (
        this.axisSetRepository.activeAxisSet.activeAxis &&
        this.axisSetRepository.activeAxisSet.activeAxis.coord
      ) {
        this.axisSetRepository.activeAxisSet.moveActiveAxis(vector)
        this.canvasHandler.setCursor(
          this.axisSetRepository.activeAxisSet.activeAxis.coord,
        )
      }
      if (this.datasetRepository.activeDataset.plotsAreActive) {
        this.datasetRepository.activeDataset.moveActivePlot(vector)
        this.interpolator.updatePreview()
        this.canvasHandler.setCursor(
          this.datasetRepository.activeDataset.plots.filter((plot: Plot) =>
            this.datasetRepository.activeDataset.activePlotIds.includes(
              plot.id,
            ),
          )[0],
        )
      }
    },
    getDirectionFromKey(key: string) {
      switch (key) {
        case 'ArrowUp':
          return 'up'
        case 'ArrowDown':
          return 'down'
        case 'ArrowRight':
          return 'right'
        case 'ArrowLeft':
          return 'left'
        default:
          throw new Error(`undefined direction: ${key}`)
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__canvas-wrapper {
    position: relative;
    cursor: crosshair;
    -webkit-user-drag: none;
    outline: solid 1px gray;
    overflow: auto;
    max-height: 80vh;
  }
}
</style>
