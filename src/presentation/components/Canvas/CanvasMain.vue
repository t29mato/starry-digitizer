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
    <canvas-axes-guide></canvas-axes-guide>
    <canvas-axes></canvas-axes>
    <canvas-plots></canvas-plots>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CanvasAxes, CanvasPlots, CanvasCursor, CanvasAxesGuide } from '.'
import { Vector } from '@/domain/repositories/axisRepository/axisRepositoryInterface'
import { Coord, Plot } from '@/domain/models/dataset/datasetInterface'

import { useDatasetsStore } from '@/store/datasets'
import { mapState, mapActions } from 'pinia'
import { getMouseCoordFromMouseEvent } from '@/presentation/utils/mouseEventUtilities'
import { getRectCoordsFromDragCoords } from '@/presentation/utils/dragRectangleCalculator'

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { Confirmer } from '@/application/services/confirmer/confirmer'
import { Extractor } from '@/application/services/extractor/extractor'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'

// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

export default defineComponent({
  components: {
    CanvasAxes,
    CanvasPlots,
    CanvasCursor,
    CanvasAxesGuide,
  },
  props: {
    imagePath: String,
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      confirmer: Confirmer.getInstance(),
      extractor: Extractor.getInstance(),
      canvasHandler: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
    }
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
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
    ...mapActions(useDatasetsStore, [
      'addPlot',
      'switchActivatedPlot',
      'moveActivePlot',
      'clearActivePlots',
      'inactivatePlots',
      'activatePlotsInRectangleArea',
    ]),
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
          this.addPlot({
            xPx: isOnCanvasPlot
              ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
                this.canvasHandler.scale
              : (e.offsetX - offsetPx) / this.canvasHandler.scale,
            yPx: isOnCanvasPlot
              ? (e.offsetY + parseFloat(target.style.top)) /
                this.canvasHandler.scale
              : e.offsetY / this.canvasHandler.scale,
          })
          this.axes.inactivateAxis()
          this.datasets.activeDataset.addManuallyAddedPlotId(
            this.datasets.activeDataset.lastPlotId,
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
      if (this.axes.nextAxis) {
        this.axes.addAxisCoord({
          xPx: (e.offsetX - offsetPx) / this.canvasHandler.scale,
          yPx: e.offsetY / this.canvasHandler.scale,
        })
        this.inactivatePlots()
        // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
        if (!this.axes.nextAxis) {
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

      this.axes.isAdjusting = false
      this.datasets.activeDataset.plotsAreAdjusting = false
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

        this.activatePlotsInRectangleArea(topLeftCoord, bottomRightCoord)

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
        this.datasets.activeDataset.hasActive() &&
        (key === 'Backspace' || key === 'Delete')
      ) {
        this.clearActivePlots()

        if (this.interpolator.isActive) {
          this.interpolator.updatePreview()
        }

        const lastPlotId = this.datasets.activeDataset.lastPlotId

        if (lastPlotId !== -1) {
          this.switchActivatedPlot(lastPlotId)
        }

        return
      }
      const shiftKeyIsPressed = e.shiftKey
      const vector: Vector = {
        direction: this.getDirectionFromKey(key),
        distancePx: shiftKeyIsPressed ? 10 : 1,
      }
      if (this.axes.activeAxis && this.axes.activeAxis.coord) {
        this.axes.moveActiveAxis(vector)
        this.canvasHandler.setCursor(this.axes.activeAxis.coord)
      }
      if (this.datasets.activeDataset.plotsAreActive) {
        this.moveActivePlot(vector)
        this.interpolator.updatePreview()
        this.canvasHandler.setCursor(
          this.datasets.activeDataset.plots.filter((plot: Plot) =>
            this.datasets.activeDataset.activePlotIds.includes(plot.id),
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
