<template>
  <v-container fluid>
    <template>
      <v-row>
        <v-col cols="9">
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
              'max-height': '70vh',
            }"
            id="canvasWrapper"
            @click="plot"
            @mousemove="mouseMove"
          >
            <!-- TODO: uploadImageUrlはcanvasManagerで描画してるのでdataプロパティ上は不要 -->
            <canvas id="imageCanvas" :src="uploadImageUrl"></canvas>
            <canvas
              id="maskCanvas"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0.5,
              }"
              @mousemove="mouseMoveOnMask"
            ></canvas>
            <div v-for="(axis, index) in showAxesPos" :key="'axesPos' + index">
              <canvas-axes
                :imageIsScaled="imageIsScaled"
                :axesSize="axesSizePx"
                :axis="axis"
                :color="
                  isMovingAxis && movingAxisIndex === index
                    ? 'red'
                    : 'limegreen'
                "
                :index="index"
              ></canvas-axes>
            </div>
            <!-- TODO: activeなplotはborder色を追加してわかるようにする -->
            <canvas-plot
              v-for="plot in showPlots"
              v-show="shouldShowPoints"
              :key="plot.id"
              :plotSize="plotSizePx"
              :plot="plot"
              :isActive="isMovingPlot && movingPlotId === plot.id"
              :activatePlot="activatePlot"
              :imageIsScaled="imageIsScaled"
            ></canvas-plot>
            <canvas-cursor
              :cursor="showCanvasCursor"
              :label="cursorLabel"
            ></canvas-cursor>
          </div>
          <canvas-footer
            :axes="showAxesPos"
            :isMovingPlot="isMovingPlot"
            :shouldShowPoints="shouldShowPoints"
            :clearPoints="clearPoints"
            :clearAxes="clearAxes"
            :plots="showPlots"
            :removePlot="removePlot"
            :switchShowPlots="switchShowPlots"
          ></canvas-footer>
          <v-row class="mt-0">
            <v-col>
              <plots-table
                :activatePlot="activatePlot"
                :calculatedPlots="calculatedPlots"
                :movingPlotId="movingPlotId"
              ></plots-table>
            </v-col>
            <v-col>
              <clipboard
                :plots="calculatedPlots"
                :exportPlots="exportPlots"
                :exportBtnText="exportBtnText"
              ></clipboard>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="3">
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
            :isMovingPlot="isMovingPlot"
            :movingPlotId="movingPlotId"
            :shouldShowPoints="shouldShowPoints"
            :xyValue="calculateXY(canvasCursor.xPx, canvasCursor.yPx)"
            :imageIsScaled="imageIsScaled"
          ></magnifier>
          <h3>XY Axes</h3>
          <axes-settings
            :axes="axesValues"
            @input="inputAxes"
            @change="changeIsLog"
            :isLog="isLog"
            :error="axesValuesErrorMessage"
          ></axes-settings>
          <h3>
            Automatic Extraction<v-btn
              class="ml-2"
              :loading="isExtracting"
              @click="extractPlots"
              color="primary"
              >Run</v-btn
            >
          </h3>
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
          <h4>
            Draw Mask

            <v-btn-toggle v-model="maskMode" dense class="pl-2">
              <v-btn> Pen </v-btn>
            </v-btn-toggle>
            <v-btn class="ml-1" :disabled="!isDrawnMask" @click="clearMask">
              Clear
            </v-btn>
          </h4>
          <v-text-field
            v-if="maskMode === 0"
            v-model="penToolSize"
            type="number"
            hide-details
            label="Pen Size"
          ></v-text-field>
          <br />
          <h4>Extracted Color</h4>
          <input type="color" v-model="colorPicker" />
          <v-color-picker
            v-model="colorPicker"
            hide-canvas
            hide-inputs
            show-swatches
            hide-sliders
            :swatches="swatches"
          ></v-color-picker>
          <v-slider
            v-model="colorDistancePct"
            thumb-label="always"
            max="20"
            min="1"
            label="Color Diff."
            thumb-size="20"
            dense
          ></v-slider>
          <p class="grey--text">v{{ version }}</p>
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
import PlotsTable from './Export/PlotsTable.vue'
import Clipboard from './Export/Clipboard.vue'
import {
  Plot,
  PlotValue,
  Position,
  DiameterRange,
  ExtractAlgorithm,
  LineExtractProps,
} from '../types'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/LineExtract'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import {
  AxesSettings,
  SymbolExtractSettings,
  LineExtractSettings,
} from './Settings'
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
    PlotsTable,
    Clipboard,
    AxesSettings,
    SymbolExtractSettings,
    LineExtractSettings,
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
      // REFACTOR: color typeを作成する
      colors: [] as { R: number; G: number; B: number }[][],
      shouldShowPoints: true,
      colorDistancePct: 5,
      colorPicker: black,
      isExtracting: false,
      plotSizePx: 4,
      axesSizePx: 4,
      canvasScale: 1,
      magnifierSizePx: 200,
      // REFACTOR: 変数名を変更 → axesIsActive
      isMovingAxis: false,
      cursorIsMoved: false,
      movingAxisIndex: 0,
      isMovingPlot: false,
      // REFACTOR: 変数名をactiveなどにする
      movingPlotId: 0,
      red,
      canvasWidth: 0,
      canvasHeight: 0,
      swatches: [...Array(5)].map(() => []) as string[][],
      isDrawnMask: false,
      axesValuesErrorMessage: '',
      penToolSize: 50,
    }
  },
  computed: {
    showPlots(): Plot[] {
      if (this.imageIsScaled) {
        return this.plots.map((plot) => {
          return {
            id: plot.id,
            xPx: plot.xPx * this.canvasScale,
            yPx: plot.yPx * this.canvasScale,
          }
        })
      }
      return this.plots
    },
    showAxesPos(): Position[] {
      if (this.imageIsScaled) {
        return this.axesPos.map((axis) => {
          return {
            xPx: axis.xPx * this.canvasScale,
            yPx: axis.yPx * this.canvasScale,
          }
        })
      }
      return this.axesPos
    },
    showCanvasCursor(): Position {
      if (this.imageIsScaled) {
        return {
          xPx: this.canvasCursor.xPx * this.canvasScale,
          yPx: this.canvasCursor.yPx * this.canvasScale,
        }
      }
      return this.canvasCursor
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
    // REFACTOR: もう少し状態管理綺麗に
    cursorLabel(): string {
      if (this.isDrawingMask) {
        return 'Mask'
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
      const newPlots = this.plots.map((plot) => {
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
      return this.plots.length
    },
    imageIsScaled(): boolean {
      return this.canvasScale !== 1
    },
    canvasHeightInt(): number {
      return Math.floor(this.canvasHeight)
    },
    canvasWidthInt(): number {
      return Math.floor(this.canvasWidth)
    },
    isDrawingMask(): boolean {
      switch (this.maskMode) {
        case 0:
        case 1:
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
      this.plots.sort((a, b) => {
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
      if (this.isMovingPlot) {
        switch (e.key) {
          case arrowUp:
            this.plots.filter((plot) => plot.id === this.movingPlotId)[0].yPx--
            break
          case arrowRight:
            this.plots.filter((plot) => plot.id === this.movingPlotId)[0].xPx++
            break
          case arrowDown:
            this.plots.filter((plot) => plot.id === this.movingPlotId)[0].yPx++
            break
          case arrowLeft:
            this.plots.filter((plot) => plot.id === this.movingPlotId)[0].xPx--
            break
          default:
            break
        }
        this.canvasCursor = this.plots.filter(
          (plot) => plot.id === this.movingPlotId
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
      this.isMovingPlot = false
      this.plots = []
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
        this.plots = extractor.execute(
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
        cm.drawImage()
        this.updateSwatches(cm.colorSwatches)
        this.uploadImageUrl = fr.result
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

      this.isMovingPlot = true
      this.movingPlotId = this.nextPlotId
      this.plots.push({
        id: this.nextPlotId,
        xPx: (e.offsetX - offsetPx) / this.canvasScale,
        yPx: e.offsetY / this.canvasScale,
      })
      this.shouldShowPoints = true
    },
    activatePlot(id: number) {
      this.movingPlotId = id
      this.isMovingPlot = true
      this.isMovingAxis = false
    },
    clearAxes() {
      this.axesPos = []
      this.isMovingAxis = false
      this.isMovingPlot = false
      this.cursorIsMoved = false
    },
    clearPoints() {
      this.plots = []
      this.shouldShowPoints = true
      this.isMovingPlot = false
    },
    removeAxis() {
      this.axesPos.pop()
      this.isMovingAxis = false
    },
    removePlot() {
      this.plots = this.plots.filter((plot) => {
        return plot.id !== this.movingPlotId
      })
      this.isMovingPlot = false
    },
    mouseMove(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      this.cursorIsMoved = false
      this.canvasCursor = {
        xPx:
          (e.offsetX - offsetPx + parseFloat(target.style.left)) /
          this.canvasScale,
        yPx: (e.offsetY + parseFloat(target.style.top)) / this.canvasScale,
      }
    },
    mouseMoveOnMask(e: MouseEvent) {
      // INFO: 左クリックされてる状態
      if (e.buttons === 1 && this.maskMode === 0) {
        cm.drawMask(e.offsetX, e.offsetY, this.penToolSize)
        this.isDrawnMask = true
      }
      // INFO: クリックされていない状態
      if (e.buttons === 0) {
        cm.resetDrawMaskPos()
      }
    },
    clearMask() {
      const maskCanvas = document.getElementById(
        'maskCanvas'
      ) as HTMLCanvasElement
      const ctx = maskCanvas.getContext('2d') as CanvasRenderingContext2D
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      this.isDrawnMask = false
    },
  },
})
</script>
