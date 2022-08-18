<template>
  <div
    :style="{
      position: 'relative',
      cursor: 'crosshair',
      'user-drag': 'none',
      outline: 'solid 1px grey',
      overflow: 'auto',
      'max-height': '87vh',
    }"
    id="canvasWrapper"
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
    <canvas-axes></canvas-axes>
    <canvas-plots></canvas-plots>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { canvasMapper } from '@/store/modules/canvas'
import { axesMapper } from '@/store/modules/axes'
import { datasetMapper } from '@/store/modules/dataset'
import { CanvasAxes, CanvasPlots, CanvasCursor } from '.'
import { extractorMapper } from '@/store/modules/extractor'

// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

export default Vue.extend({
  components: {
    CanvasAxes,
    CanvasPlots,
    CanvasCursor,
  },
  props: {
    imagePath: String,
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  computed: {
    ...canvasMapper.mapGetters(['canvas']),
    ...axesMapper.mapGetters(['axes']),
    ...datasetMapper.mapGetters(['datasets']),
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler.bind(this))

    if (!this.imagePath) {
      return
    }
    try {
      await this.canvas.initialize(this.imagePath)
      this.drawFitSizeImage()
      this.setUploadImageUrl(this.imagePath)
      this.setSwatches(this.canvas.colorSwatches)
    } finally {
      //
    }
  },
  methods: {
    ...datasetMapper.mapActions([
      'addPlot',
      'moveActivePlot',
      'clearActivePlots',
    ]),
    ...canvasMapper.mapActions([
      'mouseMoveOnCanvas',
      'setCanvasCursor',
      'drawFitSizeImage',
      'setUploadImageUrl',
      'setManualMode',
    ]),
    ...axesMapper.mapActions(['addAxis', 'inactivateAxis', 'moveActiveAxis']),
    ...extractorMapper.mapActions(['setSwatches']),
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
      if (this.axes.hasNext) {
        this.addAxis({
          xPx: (e.offsetX - offsetPx) / this.canvas.scale,
          yPx: e.offsetY / this.canvas.scale,
        })
        // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
        if (!this.axes.hasNext) {
          this.canvas.manualMode = 0
        }
        return
      }
    },
    mouseMove(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)
      this.setCanvasCursor({
        xPx: xPx / this.canvas.scale,
        yPx: yPx / this.canvas.scale,
      })
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (!isClicking) {
        return
      }
      // TODO: 呼び出すメソッドはCanvasに移譲したい
      this.mouseMoveOnCanvas({ xPx, yPx })
    },
    mouseDown(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)
      if (this.canvas.maskMode === 1) {
        this.canvas.mouseDownForBox(xPx, yPx)
      }
    },
    mouseUp() {
      if (this.canvas.maskMode === 1) {
        this.canvas.mouseUpForBox()
      }
    },
    keyDownHandler(e: KeyboardEvent) {
      // INFO: 入力フィールドにカーソルが当たってる場合はスルー
      if ((e.target as Element).nodeName === 'INPUT') {
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
      if (this.axes.isActive) {
        this.moveActiveAxis(key)
        this.setCanvasCursor(this.axes.activeAxis)
      }
      if (this.datasets.activeDataset.plotsAreActive) {
        this.moveActivePlot(e.key)
        this.setCanvasCursor(
          this.datasets.activeDataset.plots.filter((plot) =>
            this.datasets.activeDataset.activePlotIds.includes(plot.id)
          )[0]
        )
      }
    },
  },
})
</script>
