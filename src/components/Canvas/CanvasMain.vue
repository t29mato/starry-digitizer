<template>
  <div
    id="canvasWrapper"
    class="c__canvas-wrapper"
    @click="plot"
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
    <canvas-axes-guide></canvas-axes-guide>
    <canvas-axes></canvas-axes>
    <canvas-plots></canvas-plots>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { CanvasAxes, CanvasPlots, CanvasCursor, CanvasAxesGuide } from '.'
import { Vector } from '@/domains/axes/axesInterface'
import { Coord, Plot } from '@/domains/datasetInterface'

import { useAxesStore } from '@/store/axes'
import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { mapState, mapActions } from 'pinia'
import { useExtractorStore } from '@/store/extractor'

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
  computed: {
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useAxesStore, ['axes']),
    ...mapState(useDatasetsStore, ['datasets']),
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler.bind(this))

    if (!this.imagePath) {
      return
    }
    try {
      await this.canvas.initializeImageElement(this.imagePath)
      this.drawFitSizeImage()
      this.setUploadImageUrl(this.imagePath)
      this.setSwatches(this.canvas.colorSwatches)
    } finally {
      //
    }
  },
  methods: {
    ...mapActions(useDatasetsStore, [
      'addPlot',
      'moveActivePlot',
      'clearActivePlots',
      'inactivatePlots',
      'activatePlotsInRectangleArea',
    ]),
    ...mapActions(useCanvasStore, [
      'mouseDownOnCanvas',
      'mouseDragOnCanvas',
      'mouseUpOnCanvas',
      'setCanvasCursor',
      'drawFitSizeImage',
      'setUploadImageUrl',
      'setManualMode',
    ]),
    ...mapActions(useAxesStore, [
      'addAxisCoord',
      'inactivateAxis',
      'moveActiveAxis',
    ]),
    ...mapActions(useExtractorStore, ['setSwatches']),
    // REFACTOR: modeに応じてplotなりpickColorなりを呼び出す形に変更する
    plot(e: MouseEvent): void {
      // IFNO: マスク描画モード中につき
      if (this.canvas.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPlot = target.className === 'canvas-plot'
      // INFO: canvas-plot element上の時は、plot edit modeになるので
      switch (this.canvas.manualMode) {
        case 0:
          this.addPlot({
            xPx: isOnCanvasPlot
              ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
                this.canvas.scale
              : (e.offsetX - offsetPx) / this.canvas.scale,
            yPx: isOnCanvasPlot
              ? (e.offsetY + parseFloat(target.style.top)) / this.canvas.scale
              : e.offsetY / this.canvas.scale,
          })
          this.inactivateAxis()
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
        this.addAxisCoord({
          xPx: (e.offsetX - offsetPx) / this.canvas.scale,
          yPx: e.offsetY / this.canvas.scale,
        })
        this.inactivatePlots()
        // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
        if (!this.axes.nextAxis) {
          this.canvas.manualMode = 0
        }
        return
      }
    },
    getMouseXYFromMouseEvent(e: MouseEvent): Coord {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)

      return {
        xPx,
        yPx,
      }
    },
    mouseDrag(coord: Coord) {
      // TODO: 呼び出すメソッドはCanvasに移譲したい
      this.mouseDragOnCanvas(coord)
    },
    mouseMove(e: MouseEvent) {
      const { xPx, yPx } = this.getMouseXYFromMouseEvent(e)

      this.axes.isAdjusting = false
      this.datasets.activeDataset.plotsAreAdjusting = false
      this.setCanvasCursor({
        xPx: xPx / this.canvas.scale,
        yPx: yPx / this.canvas.scale,
      })
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (isClicking) {
        this.mouseDrag({ xPx, yPx })
      }
    },
    mouseDown(e: MouseEvent) {
      const { xPx, yPx } = this.getMouseXYFromMouseEvent(e)

      this.mouseDownOnCanvas({ xPx, yPx })
    },
    mouseUp() {
      this.mouseUpOnCanvas()

      // INFO: EDITモードかつAutomatic Extractionでない場合にplotの複数選択を行う
      if (this.canvas.manualMode === 1 && this.canvas.maskMode === -1) {
        const rect = this.canvas.rectangle

        this.activatePlotsInRectangleArea(
          { xPx: rect.startX, yPx: rect.startY },
          { xPx: rect.endX, yPx: rect.endY },
        )

        return
      }
    },
    keyDownHandler(e: KeyboardEvent) {
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
          this.setManualMode(0)
          return
        case 'e':
          this.setManualMode(1)
          return
        case 'd':
          this.setManualMode(2)
          return
      }
      if (this.datasets.activeDataset.hasActive()) {
        if (key === 'Backspace' || key === 'Delete') {
          this.clearActivePlots()
        }
      }
      const shiftKeyIsPressed = e.shiftKey
      const vector: Vector = {
        direction: this.getDirectionFromKey(key),
        distancePx: shiftKeyIsPressed ? 10 : 1,
      }
      if (this.axes.activeAxis && this.axes.activeAxis.coord) {
        this.moveActiveAxis(vector)
        this.setCanvasCursor(this.axes.activeAxis.coord)
      }
      if (this.datasets.activeDataset.plotsAreActive) {
        this.moveActivePlot(vector)
        this.setCanvasCursor(
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
