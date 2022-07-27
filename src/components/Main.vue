<template>
  <v-container fluid>
    <template>
      <v-row>
        <v-col cols="2">
          <h4>Image File</h4>
          <v-file-input
            accept="image/*"
            @change="uploadImage"
            :clearable="false"
            dense
            label="choose image file"
            class="mt-2"
          ></v-file-input>
          <axes-settings
            :axes="axesValues"
            @input="inputAxes"
            @change="changeIsLog"
            :isLog="isLog"
            :error="axesValuesErrorMessage"
          ></axes-settings>
          <dataset-manager
            :datasets="datasets"
            :addDataset="addDataset"
            :editDataset="editDataset"
            :popDataset="popDataset"
            :setActiveDataset="setActiveDataset"
            :activeDatasetId="activeDatasetId"
            :activeDataset="activeDataset"
            :exportPlots="exportPlots"
            :exportBtnText="exportBtnText"
            :calculatedPlots="calculatedPlots"
          ></dataset-manager>
        </v-col>
        <v-col class="pt-1" cols="7">
          <canvas-header
            :resizeCanvasToFit="resizeCanvasToFit"
            :resizeCanvasToOriginal="resizeCanvasToOriginal"
            :scaleUp="scaleUp"
            :scaleDown="scaleDown"
            :uploadImage="uploadImage"
            :canvasScale="canvasScale"
          ></canvas-header>
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
            <!-- TODO: uploadImageUrlはcanvasManagerで描画してるのでdataプロパティ上は不要 -->
            <canvas id="imageCanvas" :src="uploadImageUrl"></canvas>
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
            <div v-for="(axis, index) in showAxesPos" :key="'axesPos' + index">
              <canvas-axes
                :axesSize="axesSizePx"
                :axis="axis"
                :isActive="isMovingAxis && movingAxisIndex === index"
                :index="index"
              ></canvas-axes>
            </div>
            <canvas-plot
              v-for="plot in showPlots"
              v-show="shouldShowPoints"
              :key="plot.id"
              :plotSize="plotSizePx"
              :plot="plot"
              :isActive="activePlotIds.includes(plot.id)"
              :activatePlot="activatePlot"
              :toggleActivatedPlot="toggleActivatedPlot"
            ></canvas-plot>
            <canvas-cursor
              :cursor="showCanvasCursor"
              :label="cursorLabel"
            ></canvas-cursor>
          </div>
          <canvas-footer
            :axes="showAxesPos"
            :plotIsActive="plotIsActive"
            :shouldShowPoints="shouldShowPoints"
            :clearPlots="clearPlots"
            :clearAxes="clearAxes"
            :plots="showPlots"
            :clearActivePlots="clearActivePlots"
            :switchShowPlots="switchShowPlots"
          ></canvas-footer>
        </v-col>
        <v-col class="pt-1" cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier
            :magnifierSizePx="magnifierSizePx"
            :uploadImageUrl="uploadImageUrl"
            :canvasCursor="showCanvasCursor"
            :axes="showAxesPos"
            :isMovingAxis="isMovingAxis"
            :movingAxisIndex="movingAxisIndex"
            :axesSizePx="axesSizePx"
            :canvasScale="canvasScale"
            :plots="showPlots"
            :plotSizePx="plotSizePx"
            :plotIsActive="plotIsActive"
            :activePlotIds="activePlotIds"
            :shouldShowPoints="shouldShowPoints"
            :xyValue="calculateXY(canvasCursor.xPx, canvasCursor.yPx)"
          ></magnifier>
          <h4>Automatic Extraction</h4>
          <v-select
            v-model="extractAlgorithm"
            :items="extractAlgorithms"
            label="Select Algorithm"
          ></v-select>
          <div v-if="extractAlgorithm === 'Symbol Extract'">
            <symbol-extract-settings
              :diameterRange="diameterRange"
              @input="setDiameterRange"
            ></symbol-extract-settings>
          </div>
          <div v-else-if="extractAlgorithm === 'Line Extract'">
            <line-extract-settings
              :settings="lineExtractProps"
              @input="setLineExtractProps"
            ></line-extract-settings>
          </div>
          <mask-settings
            :maskMode="maskMode"
            :setMaskMode="setMaskMode"
            :isDrawnMask="isDrawnMask"
            :clearMask="clearMask"
            :penToolSize="penToolSize"
            :eraserSize="eraserSize"
            :setPenToolSize="setPenToolSize"
            :setEraserSize="setEraserSize"
          ></mask-settings>
          <color-settings
            :colorPicker="colorPicker"
            :setColorPicker="setColorPicker"
            :swatches="swatches"
            :colorDistancePct="colorDistancePct"
            :setColorDistancePct="setColorDistancePct"
          ></color-settings>
          <v-btn
            :loading="isExtracting"
            @click="extractPlots"
            color="primary"
            small
            >Run</v-btn
          >
          <p class="text-caption text-right">v{{ version }}</p>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { Magnifier } from './Magnifier'
import {
  CanvasHeader,
  CanvasFooter,
  CanvasAxes,
  CanvasPlot,
  CanvasCursor,
} from './Canvas'
import {
  Plot,
  PlotValue,
  Position,
  DiameterRange,
  ExtractAlgorithm,
  LineExtractProps,
  Datasets,
  Dataset,
} from '../types'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/LineExtract'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import {
  AxesSettings,
  SymbolExtractSettings,
  LineExtractSettings,
  MaskSettings,
  ColorSettings,
} from './Settings'
import { DatasetManager } from './DatasetManager'
import ExtractStrategyInterface from '@/domains/extractStrategies/ExtractStrategyInterface'
import { version } from '../../package.json'
import { CanvasManager } from '@/domains/CanvasManager'

const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3] as const
const [black, red] = ['#000000ff', '#ff0000ff']
// INFO: to adjust the exact position the user clicked.
const offsetPx = 1
const cm = CanvasManager.instance
const extractAlgorithms = ['Symbol Extract', 'Line Extract'] as const

export default Vue.extend({
  components: {
    Magnifier,
    CanvasAxes,
    CanvasPlot,
    CanvasCursor,
    CanvasHeader,
    CanvasFooter,
    AxesSettings,
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
    DatasetManager,
  },
  props: {
    // should be imported by require function
    initialGraphImagePath: {
      type: String,
      required: true,
    },
    exportBtnText: String,
  },
  data() {
    return {
      extractAlgorithms,
      version,
      extractAlgorithm: 'Symbol Extract' as ExtractAlgorithm,
      diameterRange: {
        min: 5,
        max: 100,
      },
      lineExtractProps: {
        width: 1,
        interval: 10,
      } as LineExtractProps,
      plotShapeMode: 0,
      maskMode: -1,
      isLog: {
        x: false,
        y: false,
      },
      uploadImageUrl: '',
      axesPos: [] as Position[],
      // REFACOTR: v-text-fieldのv-modeがstringのためだが、利用時はnumberなので読みやすい方法考える
      axesValues: {
        x1: '0',
        x2: '1',
        y1: '0',
        y2: '1',
      },
      canvasCursor: {
        xPx: 0,
        yPx: 0,
      } as Position,
      plots: [] as Plot[],
      datasets: [
        {
          id: 1,
          name: 'dataset 1',
          plots: [],
        },
      ] as Datasets,
      activeDatasetId: 1,
      // REFACTOR: color typeを作成する
      colors: [] as { R: number; G: number; B: number }[][],
      shouldShowPoints: true,
      colorDistancePct: 5,
      colorPicker: black,
      isExtracting: false,
      plotSizePx: 10,
      axesSizePx: 10,
      canvasScale: cm.canvasScale,
      magnifierSizePx: 200,
      // REFACTOR: 変数名を変更 → axesIsActive
      isMovingAxis: false,
      cursorIsMoved: false,
      movingAxisIndex: 0,
      // REFACTOR: 変数名をactiveなどにする
      activePlotIds: [] as number[],
      red,
      canvasWidth: 0,
      canvasHeight: 0,
      swatches: [...Array(5)].map(() => []) as string[][],
      isDrawnMask: cm.isDrawnMask,
      axesValuesErrorMessage: '',
      penToolSize: 50,
      eraserSize: 30,
    }
  },
  computed: {
    activeDataset(): Dataset {
      const targetDataset = this.datasets.find((dataset) => {
        return dataset.id === this.activeDatasetId
      })
      if (!targetDataset) {
        throw new Error('There are no active datasets.')
      }
      return targetDataset
    },
    plotIsActive(): boolean {
      return this.activePlotIds.length > 0
    },
    showPlots(): Plot[] {
      return this.activeDataset.plots.map((plot) => {
        return {
          id: plot.id,
          xPx: plot.xPx * this.canvasScale,
          yPx: plot.yPx * this.canvasScale,
        }
      })
    },
    showAxesPos(): Position[] {
      return this.axesPos.map((axis) => {
        return {
          xPx: axis.xPx * this.canvasScale,
          yPx: axis.yPx * this.canvasScale,
        }
      })
    },
    showCanvasCursor(): Position {
      return {
        xPx: this.canvasCursor.xPx * this.canvasScale,
        yPx: this.canvasCursor.yPx * this.canvasScale,
      }
    },
    // REFACTOR: canvas-cursorコンポーネントの中に閉じ込めたい
    showNextAxisName(): string {
      switch (this.axesPos.length) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        case 4:
          return ''
        default:
          throw new Error(
            `count of axes is ${this.axesPos.length}, but the maximum must be 4`
          )
      }
    },
    showPenToolSize(): number {
      return this.penToolSize * this.canvasScale
    },
    showEraserSize(): number {
      return this.eraserSize * this.canvasScale
    },
    cursorLabel(): string {
      switch (this.maskMode) {
        case 0:
          return 'Pen'
        case 1:
          return 'Box'
        case 2:
          return 'Eraser'
      }
      if (this.axesPos.length < 4) {
        return this.showNextAxisName
      }
      return ''
    },
    targetColor(): { R: number; G: number; B: number } {
      return {
        R: parseInt(this.colorPicker.slice(1, 3), 16),
        G: parseInt(this.colorPicker.slice(3, 5), 16),
        B: parseInt(this.colorPicker.slice(5, 7), 16),
      }
    },
    targetColorHex(): string {
      return (
        '#' +
        this.targetColor.R.toString(16) +
        this.targetColor.G.toString(16) +
        this.targetColor.B.toString(16)
      )
    },
    magnificationRadiusSizePx(): number {
      return this.magnifierSizePx / 2
    },
    axesRadiusSizePx(): number {
      return this.axesSizePx / 2
    },
    calculatedPlots(): PlotValue[] {
      const newPlots = this.activeDataset.plots.map((plot) => {
        const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
        return {
          id: plot.id,
          xPx: plot.xPx,
          yPx: plot.yPx,
          xV,
          yV,
        }
      })
      return newPlots
    },
    nextPlotId(): number {
      if (this.activeDataset.plots.length === 0) {
        return 1
      }
      return (
        this.activeDataset.plots[this.activeDataset.plots.length - 1].id + 1
      )
    },
    nextDatasetId(): number {
      if (this.datasets.length === 0) {
        return 1
      }
      return this.datasets[this.datasets.length - 1].id + 1
    },
    canvasHeightInt(): number {
      return Math.floor(this.canvasHeight)
    },
    // TODO: canvasWidthIntは利用していないので削除する
    canvasWidthInt(): number {
      return Math.floor(this.canvasWidth)
    },
    isDrawingMask(): boolean {
      switch (this.maskMode) {
        case 0:
        case 1:
        case 2:
          return true
        default:
          return false
      }
    },
  },
  async mounted() {
    document.addEventListener('keydown', this.keyListener.bind(this))
    if (!this.initialGraphImagePath) {
      return
    }
    try {
      await cm.initialize(
        'canvasWrapper',
        'imageCanvas',
        'maskCanvas',
        'tempMaskCanvas',
        'magnifierMaskCanvas',
        this.initialGraphImagePath
      )
      this.uploadImageUrl = this.initialGraphImagePath
      this.canvasWidth = cm.imageCanvas.width
      this.canvasHeight = cm.imageCanvas.height
      this.canvasScale = cm.canvasScale
      this.updateSwatches(cm.colorSwatches)
    } finally {
      //
    }
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyListener)
  },
  methods: {
    setActiveDataset(id: number) {
      this.activeDatasetId = id
    },
    editDataset(datasetId: number, newName: string) {
      const targetDataset = this.datasets.find((dataset) => {
        return dataset.id === datasetId
      })
      if (!targetDataset) {
        throw new Error(datasetId + "doesn't exist.")
      }
      targetDataset.name = newName
    },
    addDataset(dataset: Dataset) {
      this.datasets.push(dataset)
    },
    popDataset() {
      this.datasets.pop()
    },
    setMaskMode(mode: number) {
      this.maskMode = mode
    },
    setPenToolSize(size: string) {
      this.penToolSize = parseInt(size)
    },
    setEraserSize(size: string) {
      this.eraserSize = parseInt(size)
    },
    validateAxes(): boolean {
      if (this.axesValues.x1 === this.axesValues.x2) {
        this.axesValuesErrorMessage = 'x1 and x2 should not be same value'
        return false
      }
      if (this.axesValues.y1 === this.axesValues.y2) {
        this.axesValuesErrorMessage = 'y1 and y2 should not be same value'
        return false
      }
      if (Object.values(this.axesValues).includes('')) {
        this.axesValuesErrorMessage = 'axes values should not be empty'
        return false
      }
      this.axesValuesErrorMessage = ''
      return this.axesPos.length === 4
    },
    exportPlots() {
      const plots = this.calculatedPlots
      this.$emit('click', plots)
    },
    // TODO: setSymbolExtractPropsに変更する
    setDiameterRange(diameterRange: DiameterRange) {
      this.diameterRange = diameterRange
    },
    setLineExtractProps(props: LineExtractProps) {
      this.lineExtractProps = props
    },
    inputAxes(axesValues: { x1: string; x2: string; y1: string; y2: string }) {
      this.axesValues = axesValues
    },
    changeIsLog(isLog: { x: boolean; y: boolean }) {
      this.isLog = isLog
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!this.validateAxes()) {
        return { xV: '0', yV: '0' }
      }
      const calculator = new XYAxesCalculator(
        {
          x1: Object.assign(this.axesPos[indexX1], {
            value: parseFloat(this.axesValues.x1),
          }),
          x2: Object.assign(this.axesPos[indexX2], {
            value: parseFloat(this.axesValues.x2),
          }),
          y1: Object.assign(this.axesPos[indexY1], {
            value: parseFloat(this.axesValues.y1),
          }),
          y2: Object.assign(this.axesPos[indexY2], {
            value: parseFloat(this.axesValues.y2),
          }),
        },
        {
          x: this.isLog.x,
          y: this.isLog.y,
        }
      )
      return calculator.calculateXYValues(x, y)
    },
    switchShowPlots(): void {
      this.shouldShowPoints = !this.shouldShowPoints
    },
    sortPlots() {
      this.activeDataset.plots.sort((a, b) => {
        return a.xPx - b.xPx
      })
    },
    updateSwatches(colorSwatches: string[]) {
      this.swatches = [...Array(5)].map(() => [])
      colorSwatches.forEach((color, index) => {
        this.swatches[index % this.swatches.length].push(color)
      })
      this.colorPicker = colorSwatches[0]
    },
    keyListener(e: KeyboardEvent) {
      const [arrowUp, arrowRight, arrowDown, arrowLeft] = [
        'ArrowUp',
        'ArrowRight',
        'ArrowDown',
        'ArrowLeft',
      ]
      const key = e.key
      if (![arrowUp, arrowRight, arrowDown, arrowLeft].includes(key)) {
        return
      }
      e.preventDefault()
      this.cursorIsMoved = true
      if (this.isMovingAxis) {
        switch (key) {
          case arrowUp:
            this.axesPos[this.movingAxisIndex].yPx--
            break
          case arrowRight:
            this.axesPos[this.movingAxisIndex].xPx++
            break
          case arrowDown:
            this.axesPos[this.movingAxisIndex].yPx++
            break
          case arrowLeft:
            this.axesPos[this.movingAxisIndex].xPx--
            break
          default:
            break
        }
        this.canvasCursor = this.axesPos[this.movingAxisIndex]
      }
      if (this.plotIsActive) {
        switch (e.key) {
          case arrowUp:
            this.activeDataset.plots
              .filter((plot) => this.activePlotIds.includes(plot.id))
              .map((plot) => plot.yPx--)
            break
          case arrowRight:
            this.activeDataset.plots
              .filter((plot) => this.activePlotIds.includes(plot.id))
              .map((plot) => plot.xPx++)
            break
          case arrowDown:
            this.activeDataset.plots
              .filter((plot) => this.activePlotIds.includes(plot.id))
              .map((plot) => plot.yPx++)
            break
          case arrowLeft:
            this.activeDataset.plots
              .filter((plot) => this.activePlotIds.includes(plot.id))
              .map((plot) => plot.xPx--)
            break
          default:
            break
        }
        this.canvasCursor = this.activeDataset.plots.filter((plot) =>
          this.activePlotIds.includes(plot.id)
        )[0]
      }
    },
    scaleUp() {
      cm.scaleUp()
      this.canvasScale = cm.canvasScale
    },
    scaleDown() {
      cm.scaleDown()
      this.canvasScale = cm.canvasScale
    },
    resizeCanvasToOriginal() {
      cm.drawOriginalSizeImage()
      this.canvasScale = 1
    },
    resizeCanvasToFit() {
      cm.drawFitSizeImage()
      this.canvasScale = cm.canvasScale
    },
    async extractPlots() {
      this.isExtracting = true
      this.isMovingAxis = false
      this.activeDataset.plots = []
      try {
        let extractor: ExtractStrategyInterface
        switch (this.extractAlgorithm) {
          case 'Symbol Extract':
            extractor = new SymbolExtractByArea(this.diameterRange)
            break
          case 'Line Extract':
            extractor = new LineExtract(this.lineExtractProps)
            break
          default:
            throw new Error('Extract algorithm is not selected.')
        }
        this.activeDataset.plots = extractor.execute(
          cm,
          [this.targetColor.R, this.targetColor.G, this.targetColor.B],
          this.colorDistancePct,
          this.isDrawnMask
        )
        this.sortPlots()
        this.shouldShowPoints = true
      } catch (e) {
        console.error('failed to extractPlots', { cause: e })
      } finally {
        this.isExtracting = false
      }
    },
    async uploadImage(file: File) {
      try {
        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        // TODO: CanvasManagerを利用する
        const image = await this.loadImage(fr.result)
        cm.changeImage(image)
        this.canvasScale = cm.canvasScale
        cm.drawFitSizeImage()
        this.updateSwatches(cm.colorSwatches)
        this.uploadImageUrl = fr.result
        this.clearAxes()
        this.clearPlots()
      } finally {
        //
      }
    },
    loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = (error) => reject(error)
        img.src = src
      })
    },
    readFile(file: File): Promise<FileReader> {
      return new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.readAsDataURL(file)
        fr.addEventListener('load', () => resolve(fr))
        fr.addEventListener('error', (error) => reject(error))
      })
    },
    // REFACTOR: modeに応じてplotなりpickColorなりを呼び出す形に変更する
    plot(e: MouseEvent): void {
      // IFNO: マスク描画モード中につき
      if (this.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPlot = target.className === 'canvas-plot'
      // INFO: canvas-plot element上の時は、plot edit modeになるので
      if (isOnCanvasPlot) {
        return
      }
      if (this.axesPos.length < 4) {
        this.isMovingAxis = true
        this.cursorIsMoved = false
        this.movingAxisIndex = this.axesPos.length
        this.axesPos.push({
          xPx: (e.offsetX - offsetPx) / this.canvasScale,
          yPx: e.offsetY / this.canvasScale,
        })
        return
      }
      this.isMovingAxis = false

      this.activePlotIds = [this.nextPlotId]
      // this.activeDataset.plots.push({
      //   id: this.nextPlotId,
      //   xPx: (e.offsetX - offsetPx) / this.canvasScale,
      //   yPx: e.offsetY / this.canvasScale,
      // })
      this.activeDataset.plots.push({
        id: this.nextPlotId,
        xPx: (e.offsetX - offsetPx) / this.canvasScale,
        yPx: e.offsetY / this.canvasScale,
      })
      this.shouldShowPoints = true
    },
    activatePlot(id: number) {
      this.activePlotIds = [id]
      this.isMovingAxis = false
    },
    toggleActivatedPlot(toggledId: number) {
      if (this.activePlotIds.includes(toggledId)) {
        this.activePlotIds = this.activePlotIds.filter((id) => {
          return id !== toggledId
        })
        return
      }
      this.activePlotIds.push(toggledId)
    },
    clearAxes() {
      this.axesPos = []
      this.isMovingAxis = false
      this.cursorIsMoved = false
    },
    clearPlots() {
      this.activeDataset.plots = []
      this.shouldShowPoints = true
    },
    clearActivePlots() {
      this.activeDataset.plots = this.activeDataset.plots.filter((plot) => {
        return !this.activePlotIds.includes(plot.id)
      })
      this.activePlotIds = []
    },
    mouseMove(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)
      this.cursorIsMoved = false
      this.canvasCursor = {
        xPx: xPx / this.canvasScale,
        yPx: yPx / this.canvasScale,
      }
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (!isClicking) {
        cm.resetDrawMaskPos()
      } else {
        // TODO: 呼び出すメソッドはCanvasManagerに移譲したい
        switch (this.maskMode) {
          case 0: // INFO: pen mask
            cm.mouseMoveForPen(xPx, yPx, this.showPenToolSize)
            this.isDrawnMask = cm.isDrawnMask
            break
          case 1: // INFO: box mask
            cm.mouseMoveForBox(xPx, yPx)
            break
          case 2: // INFO: eraser mask
            cm.mouseMoveForEraser(xPx, yPx, this.showEraserSize)
            break
          default:
            break
        }
      }
    },
    mouseDown(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)
      if (this.maskMode === 1) {
        cm.mouseDownForBox(xPx, yPx)
      }
    },
    mouseUp() {
      if (this.maskMode === 1) {
        cm.mouseUpForBox()
        this.isDrawnMask = cm.isDrawnMask
      }
    },
    clearMask() {
      cm.clearMask()
      this.isDrawnMask = cm.isDrawnMask
      // INFO: マスク削除後はマスク描画されておらず消しゴムツールを使う必要ないため。
      if (this.maskMode === 2) {
        this.maskMode = -1
      }
    },
    setColorPicker(color: string) {
      this.colorPicker = color
    },
    setColorDistancePct(distance: number) {
      this.colorDistancePct = distance
    },
  },
})
</script>
