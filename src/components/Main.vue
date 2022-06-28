<template>
  <v-container>
    <template>
      <v-row>
        <v-col cols="9">
          <canvas-header
            :resizeCanvasToFit="resizeCanvasToFit"
            :resizeCanvasToMax="resizeCanvasToMax"
            :uploadImage="uploadImage"
          ></canvas-header>
          <div
            :style="{
              position: 'relative',
              cursor: 'crosshair',
              'user-drag': 'none',
              outline: 'solid 1px grey',
            }"
            id="wrapper"
            @click="plot"
            @mousemove="mouseMove"
          >
            <canvas id="imageCanvas" :src="uploadImageUrl" :style="{}"></canvas>
            <canvas
              id="maskCanvas"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0.5,
              }"
              :width="canvasWidth"
              :height="canvasHeight"
              @mousemove="mouseMoveOnMask"
            ></canvas>
            <div v-for="(axis, index) in axesPos" :key="'axesPos' + index">
              <canvas-axes
                :axesSize="axesSizePx"
                :axis="axis"
                :color="
                  isMovingAxis && movingAxisIndex === index
                    ? 'limegreen'
                    : axesColor
                "
                :index="index"
              ></canvas-axes>
            </div>
            <!-- TODO: activeなplotはborder色を追加してわかるようにする -->
            <canvas-plot
              v-for="plot in plots"
              v-show="shouldShowPoints"
              :key="plot.id"
              :plotSize="plotSizePx"
              :plot="plot"
              :isActive="isMovingPlot && movingPlotId === plot.id"
              :activatePlot="activatePlot"
            ></canvas-plot>
            <canvas-cursor
              :cursor="canvasCursor"
              :label="cursorLabel"
            ></canvas-cursor>
          </div>
          <canvas-footer
            :axes="axesPos"
            :isMovingPlot="isMovingPlot"
            :shouldShowPoints="shouldShowPoints"
            :clearPoints="clearPoints"
            :clearAxes="clearAxes"
            :plots="plots"
            :removePlot="removePlot"
            :switchShowPlots="switchShowPlots"
          ></canvas-footer>
          {{ plots.length }}
          <plots-table
            :activatePlot="activatePlot"
            :calculatedPlots="calculatedPlots"
            :movingPlotId="movingPlotId"
          ></plots-table>
          <div v-if="!hideCSVText">
            <clipboard :plots="calculatedPlots"></clipboard>
          </div>
          <v-btn v-if="exportBtnText.length > 0" @click="exportPlots" text>{{
            exportBtnText
          }}</v-btn>
        </v-col>
        <v-col cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier
            :magnifierSizePx="magnifierSizePx"
            :uploadImageUrl="uploadImageUrl"
            :canvasCursor="canvasCursor"
            :axes="axesPos"
            :isMovingAxis="isMovingAxis"
            :movingAxisIndex="movingAxisIndex"
            :axesSizePx="axesSizePx"
            :canvasScale="canvasScale"
            :plots="plots"
            :plotSizePx="plotSizePx"
            :isMovingPlot="isMovingPlot"
            :movingPlotId="movingPlotId"
            :shouldShowPoints="shouldShowPoints"
            :xyValue="calculateXY(canvasCursor.xPx, canvasCursor.yPx)"
          ></magnifier>
          <h3>XY Axes</h3>
          <axes-settings
            :axes="axesValues"
            @input="inputAxes"
            @change="changeIsLog"
            :isLog="isLog"
          ></axes-settings>
          <h3>
            Automatic Extraction<v-btn
              text
              class="ml-2"
              :loading="isExtracting"
              @click="extractPlots"
              color="green"
              >Run</v-btn
            >
          </h3>
          <v-select
            v-model="extractAlgorithm"
            :items="['Symbol Extract']"
            label="Select Algorithm"
          ></v-select>
          <div v-if="extractAlgorithm === 'Symbol Extract'">
            <symbol-extract-settings
              :diameterRange="diameterRange"
              @input="setDiameterRange"
            ></symbol-extract-settings>
          </div>
          <h4>Draw Mask</h4>
          <v-btn-toggle v-model="maskMode" dense class="pl-2">
            <v-btn text> Pen </v-btn>
          </v-btn-toggle>
          <v-btn text :disabled="!isDrawnMask" @click="clearMask">
            Clear
          </v-btn>
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
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import ColorThief from 'colorthief'
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
import { Plot, PlotValue, Position, DiameterRange } from '../types'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import { AxesSettings, SymbolExtractSettings } from './Settings'

const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3] as const
const [black, red, yellow] = ['#000000ff', '#ff0000ff', '#ffff00ff']
// INFO: to adjust the exact position the user clicked.
const magicNumberPx = 1
const colorThief = new ColorThief()

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
  },
  props: {
    hideCSVText: {
      type: Boolean,
      default: false,
    },
    // should be imported by require function
    initialGraphImagePath: {
      type: String,
      required: true,
    },
    exportBtnText: {
      type: String,
    },
  },
  data() {
    return {
      extractAlgorithm: 'Symbol Extract',
      diameterRange: {
        min: 5,
        max: 100,
      },
      plotShapeMode: 0,
      shouldShowPixel: true,
      shouldShowValue: true,
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
      cursorOnFilterCanvas: {
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
      axesColor: black,
      red,
      canvasWidth: 0,
      canvasHeight: 0,
      swatches: [...Array(5)].map(() => []) as string[][],
      isFit: true,
      isDrawnMask: false,
    }
  },
  computed: {
    validateAxes(): boolean {
      if (this.axesValues.x1 === this.axesValues.x2) {
        alert('x1 and x2 should not be same value')
        return false
      }
      if (this.axesValues.y1 === this.axesValues.y2) {
        alert('y1 and y2 should not be same value')
        return false
      }
      if (Object.values(this.axesValues).includes('')) {
        console.warn('axes values should not be empty')
        return false
      }
      return this.axesPos.length === 4
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
      if (!this.validateAxes) {
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
    imageIsFit(): boolean {
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
      const wrapper = document.getElementById('wrapper') as HTMLDivElement
      const canvas = document.getElementById('imageCanvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const image = await this.loadImage(this.initialGraphImagePath)
      this.uploadImageUrl = this.initialGraphImagePath
      this.drawImage(wrapper, canvas, image, ctx)
      this.updateSwatches(image)
    } finally {
      //
    }
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyListener)
  },
  methods: {
    exportPlots() {
      const plots = this.calculatedPlots
      this.$emit('exportPlots', plots)
    },
    setDiameterRange(diameterRange: DiameterRange) {
      this.diameterRange = diameterRange
    },
    inputAxes(axesValues: { x1: string; x2: string; y1: string; y2: string }) {
      this.axesValues = axesValues
    },
    changeIsLog(isLog: { x: boolean; y: boolean }) {
      this.isLog = isLog
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!this.validateAxes) {
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
    updateSwatches(imageElement: HTMLImageElement) {
      const palette = colorThief.getPalette(imageElement).map((color) => {
        // INFO: rgbからhexへの切り替え
        return color.reduce((prev, cur) => {
          // INFO: HEXは各色16進数2桁なので
          if (cur.toString(16).length === 1) {
            return prev + '0' + cur.toString(16)
          }
          return prev + cur.toString(16)
        }, '#')
      })
      this.swatches = [...Array(5)].map(() => [])
      palette.forEach((color, index) => {
        this.swatches[index % this.swatches.length].push(color)
      })
      this.colorPicker = palette[0]
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
    async resizeCanvasToMax() {
      this.isFit = false
      try {
        const wrapper = document.getElementById('wrapper') as HTMLDivElement
        const canvas = document.getElementById(
          'imageCanvas'
        ) as HTMLCanvasElement
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const image = await this.loadImage(this.uploadImageUrl)
        this.drawImage(wrapper, canvas, image, ctx)
        this.plots = this.plots.map((plot) => {
          return {
            id: plot.id,
            xPx: plot.xPx / this.canvasScale,
            yPx: plot.yPx / this.canvasScale,
          }
        })
        this.axesPos = this.axesPos.map((axis) => {
          return {
            xPx: axis.xPx / this.canvasScale,
            yPx: axis.yPx / this.canvasScale,
          }
        })
        this.canvasScale = 1
      } finally {
        //
      }
    },
    async resizeCanvasToFit() {
      this.isFit = true
      try {
        const wrapper = document.getElementById('wrapper') as HTMLDivElement
        const canvas = document.getElementById(
          'imageCanvas'
        ) as HTMLCanvasElement
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const image = await this.loadImage(this.uploadImageUrl)
        const prevCanvasScale = this.canvasScale
        this.drawImage(wrapper, canvas, image, ctx)
        this.plots = this.plots.map((plot) => {
          return {
            id: plot.id,
            xPx: (plot.xPx * this.canvasScale) / prevCanvasScale,
            yPx: (plot.yPx * this.canvasScale) / prevCanvasScale,
          }
        })
        this.axesPos = this.axesPos.map((axis) => {
          return {
            xPx: (axis.xPx * this.canvasScale) / prevCanvasScale,
            yPx: (axis.yPx * this.canvasScale) / prevCanvasScale,
          }
        })
      } finally {
        //
      }
    },
    async extractPlots() {
      const begin_ms = new Date().getTime()
      this.isExtracting = true
      this.isMovingAxis = false
      this.isMovingPlot = false
      this.plots = []
      try {
        const wrapper = document.getElementById('wrapper') as HTMLDivElement
        const imageCanvas = document.getElementById(
          'imageCanvas'
        ) as HTMLCanvasElement
        const imageCanvasCtx = imageCanvas.getContext(
          '2d'
        ) as CanvasRenderingContext2D
        const maskCanvas = document.getElementById(
          'maskCanvas'
        ) as HTMLCanvasElement
        const maskCanvasCtx = maskCanvas.getContext(
          '2d'
        ) as CanvasRenderingContext2D
        const image = await this.loadImage(this.uploadImageUrl)
        this.drawImage(wrapper, imageCanvas, image, imageCanvasCtx)
        const maskCanvasColors = maskCanvasCtx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        ).data
        const imageCanvasColors = imageCanvasCtx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        ).data
        const extractor = new SymbolExtractByArea()
        extractor.setDiameter(this.diameterRange)
        this.plots = extractor.execute(
          maskCanvas.height,
          maskCanvas.width,
          imageCanvasColors,
          [this.targetColor.R, this.targetColor.G, this.targetColor.B],
          this.colorDistancePct,
          maskCanvasColors,
          this.isDrawnMask
        )
        this.sortPlots()
        const allCount = this.canvasWidthInt * this.canvasHeightInt
        console.info('all count:', allCount)
        // const searchedCount = targetArea.reduce((prev, cur) => {
        //   return prev + cur.filter((item) => item).length
        // }, 0)
        // console.info(
        //   'searched count:',
        //   searchedCount,
        //   '(' + Math.round((searchedCount / allCount) * 1000) / 10 + '%)'
        // )
        console.info('extracted count: ', this.plots.length)
        this.shouldShowPoints = true
      } catch (e) {
        console.error(e)
      } finally {
        const end_ms = new Date().getTime()
        console.info('time:', end_ms - begin_ms + 'ms')
        this.isExtracting = false
      }
    },
    async uploadImage(file: File) {
      try {
        const wrapper = document.getElementById('wrapper') as HTMLDivElement
        const canvas = document.getElementById(
          'imageCanvas'
        ) as HTMLCanvasElement
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        const image = await this.loadImage(fr.result)
        this.drawImage(wrapper, canvas, image, ctx)
        this.updateSwatches(image)
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
    drawImage(
      wrapper: HTMLDivElement,
      canvas: HTMLCanvasElement,
      image: HTMLImageElement,
      ctx: CanvasRenderingContext2D
    ) {
      if (this.isFit) {
        return this.drawFitSizeImage(wrapper, canvas, image, ctx)
      }
      this.drawMaxSizeImage(wrapper, canvas, image, ctx)
    },
    drawFitSizeImage(
      wrapper: HTMLDivElement,
      canvas: HTMLCanvasElement,
      image: HTMLImageElement,
      ctx: CanvasRenderingContext2D
    ) {
      const wrapperWidthPx = wrapper.offsetWidth
      const imageWidthPx = image.width
      const imageHeightPx = image.height
      const imageRatio = wrapperWidthPx / imageWidthPx
      const wrapperHeightPx = imageHeightPx * imageRatio
      canvas.setAttribute('width', String(wrapperWidthPx))
      canvas.setAttribute('height', String(wrapperHeightPx))
      ctx.drawImage(image, 0, 0, wrapperWidthPx, wrapperHeightPx)
      this.canvasWidth = wrapperWidthPx
      this.canvasHeight = wrapperHeightPx
      this.canvasScale = imageRatio
    },
    drawMaxSizeImage(
      wrapper: HTMLDivElement,
      canvas: HTMLCanvasElement,
      image: HTMLImageElement,
      ctx: CanvasRenderingContext2D
    ) {
      const imageWidthPx = image.width
      const imageHeightPx = image.height
      canvas.setAttribute('width', String(imageWidthPx))
      canvas.setAttribute('height', String(imageHeightPx))
      ctx.drawImage(image, 0, 0, imageWidthPx, imageHeightPx)
      this.canvasWidth = imageWidthPx
      this.canvasHeight = imageHeightPx
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
      const isOnCanvas = target.id === 'canvas'
      const isOnCanvasPlot = target.className === 'canvas-plot'
      // INFO: canvas-plot element上の時は、plot edit modeになるので
      if (isOnCanvasPlot) {
        return
      }
      if (!this.validateAxes) {
        this.isMovingAxis = true
        this.cursorIsMoved = false
        this.movingAxisIndex = this.axesPos.length
        this.axesPos.push({
          xPx: isOnCanvas
            ? e.offsetX - magicNumberPx
            : e.offsetX - magicNumberPx + parseFloat(target.style.left),
          yPx: isOnCanvas
            ? e.offsetY
            : e.offsetY + parseFloat(target.style.top),
        })
        return
      }
      this.isMovingAxis = false

      this.isMovingPlot = true
      this.movingPlotId = this.nextPlotId
      this.plots.push({
        id: this.nextPlotId,
        xPx: isOnCanvas
          ? e.offsetX - magicNumberPx
          : e.offsetX - magicNumberPx + parseFloat(target.style.left),
        yPx: isOnCanvas ? e.offsetY : e.offsetY + parseFloat(target.style.top),
      })
      this.shouldShowPoints = true
    },
    activatePlot(id: number) {
      this.movingPlotId = id
      this.isMovingPlot = true
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
      const isOnCanvas = target.id === 'canvas'
      this.cursorIsMoved = false
      this.canvasCursor = {
        xPx: isOnCanvas
          ? e.offsetX - magicNumberPx
          : e.offsetX - magicNumberPx + parseFloat(target.style.left),
        yPx: isOnCanvas ? e.offsetY : e.offsetY + parseFloat(target.style.top),
      }
    },
    mouseMoveOnMask(e: MouseEvent) {
      // INFO: 左クリックされてる状態
      if (e.buttons === 1 && this.maskMode === 0) {
        return this.draw(e.offsetX, e.offsetY)
      }
      this.cursorOnFilterCanvas = { xPx: 0, yPx: 0 }
    },
    draw(xPx: number, yPx: number) {
      this.isDrawnMask = true
      const maskCanvas = document.getElementById(
        'maskCanvas'
      ) as HTMLCanvasElement
      const ctx = maskCanvas.getContext('2d') as CanvasRenderingContext2D
      ctx.beginPath()
      if (this.cursorOnFilterCanvas.xPx === 0) {
        ctx.moveTo(xPx, yPx)
      } else {
        ctx.moveTo(this.cursorOnFilterCanvas.xPx, this.cursorOnFilterCanvas.yPx)
      }
      ctx.lineTo(xPx, yPx)
      ctx.lineCap = 'round'
      ctx.lineWidth = 50
      ctx.stroke()
      ctx.strokeStyle = yellow
      this.cursorOnFilterCanvas = { xPx, yPx }
    },
    clearMask() {
      const maskCanvas = document.getElementById(
        'maskCanvas'
      ) as HTMLCanvasElement
      const ctx = maskCanvas.getContext('2d') as CanvasRenderingContext2D
      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      this.isDrawnMask = false
      this.maskMode = -1
    },
  },
})
</script>
