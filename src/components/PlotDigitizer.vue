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
            <!-- TODO: PlotsのInlineのサイズに合わせる -->
            <canvas-plot
              v-for="plot in plots"
              v-show="shouldShowPoints"
              :key="plot.id"
              :plotSize="plotSizePx"
              :plot="plot"
              :color="
                isMovingPlot && movingPlotId === plot.id ? 'limegreen' : red
              "
              :activatePlot="activatePlot"
            ></canvas-plot>
            <canvas-cursor
              :cursor="canvasCursor"
              :label="cursorLabel"
              :icon="isColorPickerMode ? 'mdi-eyedropper-variant' : ''"
            ></canvas-cursor>
          </div>
          <canvas-footer
            :axes="axesPos"
            :isMovingPlot="isMovingPlot"
            :shouldShowPoints="shouldShowPoints"
            :clearPoints="clearPoints"
            :clearAxes="clearAxes"
            :clearMask="clearMask"
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
            <clipboard :text="convertPlotsIntoText"></clipboard>
          </div>
        </v-col>
        <v-col cols="3">
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
          <v-simple-table dense>
            <thead>
              <tr>
                <th></th>
                <th>Value 1</th>
                <th>Value 2</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>X</th>
                <td>
                  <v-text-field
                    v-model="axesValues.x1"
                    type="number"
                    class="ma-0 pa-0"
                    hide-details
                    label="x1"
                  ></v-text-field>
                </td>
                <td>
                  <v-text-field
                    v-model="axesValues.x2"
                    type="number"
                    class="ma-0 pa-0"
                    hide-details
                    label="x2"
                  ></v-text-field>
                </td>
                <td><v-checkbox v-model="xIsLog"></v-checkbox></td>
              </tr>
              <tr>
                <th>Y</th>
                <td>
                  <v-text-field
                    v-model="axesValues.y1"
                    type="number"
                    class="ma-0 pa-0"
                    hide-details
                    label="y1"
                  ></v-text-field>
                </td>
                <td>
                  <v-text-field
                    v-model="axesValues.y2"
                    type="number"
                    class="ma-0 pa-0"
                    hide-details
                    label="y2"
                  ></v-text-field>
                </td>
                <td>
                  <v-checkbox v-model="yIsLog"></v-checkbox>
                </td>
              </tr>
            </tbody>
          </v-simple-table>
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
          <v-checkbox
            v-model="shouldClearPlots"
            label="Clear Plots"
            dense
            hide-details
          ></v-checkbox>
          <v-checkbox
            v-model="shouldBeMasked"
            label="Mask"
            hide-details
            dense
          ></v-checkbox>
          <span>Draw Mask</span>
          <v-btn-toggle
            v-model="maskMode"
            @click="isColorPickerMode = false"
            dense
            class="pl-2"
          >
            <v-btn text disabled> Box </v-btn>
            <v-btn text @click="shouldBeMasked = true"> Pen </v-btn>
          </v-btn-toggle>
          <br />
          <span>Shape</span>
          <v-btn-toggle v-model="plotShapeMode" dense class="pl-2 pt-2">
            <v-btn icon><v-icon small>mdi-circle</v-icon> </v-btn>
            <v-btn icon><v-icon small>mdi-square</v-icon> </v-btn>
            <v-btn icon><v-icon small>mdi-rhombus</v-icon> </v-btn>
            <v-btn icon><v-icon small>mdi-triangle</v-icon> </v-btn>
          </v-btn-toggle>

          <v-slider
            v-model="plotSizePx"
            thumb-label="always"
            :max="plotMaxSizePx"
            min="4"
            label="Plot Size"
            thumb-size="20"
            dense
          ></v-slider>
          <v-slider
            v-model="plotInlineSizePx"
            thumb-label="always"
            max="10"
            min="0"
            label="Plot Inline Size"
            thumb-size="20"
            dense
          ></v-slider>
          <!-- TODO: 4つ表示させて、プロット間隔の拡大・縮小を直感的にする -->
          <div :style="{ height: plotMaxSizePx }">
            <canvas id="plotCanvas"></canvas>
          </div>
          <v-slider
            v-model="colorDistancePct"
            thumb-label="always"
            max="20"
            min="1"
            label="Color Diff."
            thumb-size="20"
            dense
          ></v-slider>
          <v-btn @click="switchColorPickerMode" icon
            ><v-icon> mdi-eyedropper-variant </v-icon></v-btn
          >
          <v-color-picker
            v-model="colorPicker"
            hide-canvas
            hide-inputs
            show-swatches
            hide-sliders
            :swatches="swatches"
          ></v-color-picker>
          <h3>Export Settings</h3>
          <v-checkbox
            label="show Pixel"
            v-model="shouldShowPixel"
            dense
            hide-details
          ></v-checkbox>
          <v-checkbox
            label="show Value"
            v-model="shouldShowValue"
            dense
            hide-details
          ></v-checkbox>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import diff from 'color-diff'
import ColorThief from 'colorthief'
import { SymbolClass, SymbolCreator } from 'symbol2array'
import { Magnifier } from './Magnifier'
import CanvasAxes from './Canvas/CanvasAxes.vue'
import CanvasPlot from './Canvas/CanvasPlot.vue'
import CanvasCursor from './Canvas/CanvasCursor.vue'
import CanvasHeader from './Canvas/CanvasHeader.vue'
import CanvasFooter from './Canvas/CanvasFooter.vue'
import PlotsTable from './Export/PlotsTable.vue'
import Clipboard from './Export/Clipboard.vue'
import { Plot, Position } from '../types'

const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3]
const [black, red, yellow] = ['#000000ff', '#ff0000ff', '#ffff00ff']
const magicNumberPx = 1
const colorThief = new ColorThief()
const symbolCreator = new SymbolCreator()

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
  },
  props: {
    hideCSVText: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      // INFO: 画像のサイズが1,000pxで1px未満の細かい調整はできず分解能4桁と考えたため
      // TODO: 有効数字はaxesValuesの値に合わせて変更する必要あり
      significantDigits: 4,
      plotShapeMode: 0,
      shouldShowPixel: true,
      shouldShowValue: true,
      isColorPickerMode: false,
      maskMode: -1,
      xIsLog: false,
      yIsLog: false,
      uploadImageUrl: '/img/test-graph-4-triangles.png',
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
      plotSizePx: 15,
      plotMaxSizePx: 30,
      plotInlineSizePx: 0,
      colorDistancePct: 5,
      colorPicker: black,
      isExtracting: false,
      axesSizePx: 8,
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
      shouldClearPlots: true,
      shouldBeMasked: false,
    }
  },
  computed: {
    axesIsSet(): boolean {
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
        default:
          throw new Error('Maximum count of axes is 4')
      }
    },
    // REFACTOR: もう少し状態管理綺麗に
    cursorLabel(): string {
      if (this.isColorPickerMode) {
        return ''
      }
      if (this.isDrawingMask) {
        return 'Mask'
      }
      if (!this.axesIsSet) {
        return this.showNextAxisName
      }
      return ''
    },
    plotBorderSize(): number {
      return Math.min(this.plotInlineSizePx, this.plotRadiusSizePx)
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
    plotRadiusSizePx(): number {
      return this.plotSizePx / 2
    },
    calculatedPlots(): {
      id: number
      xPx: number
      yPx: number
      xV: number
      yV: number
    }[] {
      const newPlots = this.plots.map((plot) => {
        const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
        return {
          id: plot.id,
          xPx: plot.xPx,
          yPx: plot.yPx,
          xV: parseFloat(xV.toPrecision(this.significantDigits)),
          yV: parseFloat(yV.toPrecision(this.significantDigits)),
        }
      })
      return newPlots
    },
    nextPlotId(): number {
      if (this.plots.length === 0) {
        return 0
      }
      return this.plots.slice(-1)[0].id + 1
    },
    convertPlotsIntoText(): string {
      if (this.plots.length === 0) {
        return ''
      }
      return this.calculatedPlots
        .reduce((prev, cur) => {
          if (this.shouldShowPixel && this.shouldShowValue) {
            return prev + `${cur.xPx}, ${cur.yPx}, ${cur.xV}, ${cur.yV}\n`
          }
          if (this.shouldShowPixel) {
            return prev + `${cur.xPx}, ${cur.yPx}\n`
          }
          if (this.shouldShowValue) {
            return prev + `${cur.xV}, ${cur.yV}\n`
          }
          return prev
        }, '')
        .trim()
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
    symbol(): SymbolClass {
      switch (this.plotShapeMode) {
        case 0:
          return symbolCreator.createSymbol(
            'circle',
            this.plotSizePx,
            this.plotInlineSizePx
          )
        case 1:
          return symbolCreator.createSymbol(
            'square',
            this.plotSizePx,
            this.plotInlineSizePx
          )
        case 2:
          return symbolCreator.createSymbol(
            'diamond',
            this.plotSizePx,
            this.plotInlineSizePx
          )
        case 3:
          return symbolCreator.createSymbol(
            'triangle',
            this.plotSizePx,
            this.plotInlineSizePx
          )
        default:
          throw new Error('unexpected plot shape')
      }
    },
  },
  async mounted() {
    try {
      const wrapper = document.getElementById('wrapper') as HTMLDivElement
      const canvas = document.getElementById('imageCanvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const image = await this.loadImage(this.uploadImageUrl)
      this.drawImage(wrapper, canvas, image, ctx)
      this.updateSwatches(image)
      this.drawPlot()
    } finally {
      //
    }
    document.addEventListener('keydown', this.keyListener.bind(this))
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyListener)
  },
  watch: {
    plotSizePx() {
      this.drawPlot()
      this.drawPlots()
    },
    plotShapeMode() {
      this.drawPlot()
      this.drawPlots()
    },
    plotInlineSizePx() {
      this.drawPlot()
      this.drawPlots()
    },
    colorPicker() {
      this.drawPlot()
    },
    plots() {
      this.drawPlots()
    },
  },
  methods: {
    switchShowPlots(): void {
      this.shouldShowPoints = !this.shouldShowPoints
    },
    drawPlots() {
      this.$nextTick(() => {
        const canvasPlots = Array.from(
          document.getElementsByClassName('canvas-plot')
        ) as Array<HTMLCanvasElement>
        const magnifierPlots = Array.from(
          document.getElementsByClassName('magnifier-plots')
        ) as Array<HTMLCanvasElement>
        // REFACTOR: forEach2つを綺麗にする
        canvasPlots.forEach((canvas, index, canvases) => {
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          canvas.width = canvas.height = this.plotSizePx
          if (index === 0) {
            ctx.fillStyle = 'red'
            this.drawSymbol(ctx)
          } else {
            ctx.drawImage(canvases[0], 0, 0)
          }
        })
        magnifierPlots.forEach((canvas, index, canvases) => {
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          canvas.width = canvas.height = this.plotSizePx / this.canvasScale
          if (index === 0) {
            ctx.fillStyle = 'red'
            ctx.scale(1 / this.canvasScale, 1 / this.canvasScale)
            this.drawSymbol(ctx)
          } else {
            ctx.drawImage(canvases[0], 0, 0)
          }
        })
      })
    },
    drawPlot() {
      const plotCanvas = document.getElementById(
        'plotCanvas'
      ) as HTMLCanvasElement
      plotCanvas.width = plotCanvas.height = this.plotSizePx
      const plotCtx = plotCanvas.getContext('2d') as CanvasRenderingContext2D
      plotCtx.clearRect(0, 0, this.plotMaxSizePx, this.plotMaxSizePx)
      plotCtx.fillStyle = this.colorPicker
      this.drawSymbol(plotCtx)
    },
    drawSymbol(ctx: CanvasRenderingContext2D) {
      const symbolArray = this.symbol.toArray().data
      for (let y = 0; y < this.plotSizePx; y++) {
        for (let x = 0; x < this.plotSizePx; x++) {
          if (symbolArray[y][x]) {
            ctx.fillRect(x, y, 1, 1)
          }
        }
      }
    },
    sortPlots() {
      this.plots.sort((a, b) => {
        return a.xPx - b.xPx
      })
    },
    switchColorPickerMode() {
      this.isColorPickerMode = !this.isColorPickerMode
      this.maskMode = -1
    },
    updateSwatches(imageElement: HTMLImageElement) {
      const palette = colorThief.getPalette(imageElement).map((color) => {
        // INFO: rgbからhexへの切り替え
        return color.reduce((prev, cur) => {
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
        this.plotSizePx = this.plotSizePx / this.canvasScale
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
        this.plotSizePx = (this.plotSizePx * this.canvasScale) / prevCanvasScale
      } finally {
        //
      }
    },
    async extractPlots() {
      const begin_ms = new Date().getTime()
      this.isExtracting = true
      if (this.shouldClearPlots) {
        this.plots = []
      }
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
        const targetArea = [...Array(maskCanvas.height)].map(() =>
          Array(maskCanvas.width).fill(false)
        )
        for (let h = 0; h < maskCanvas.height; h++) {
          for (let w = 0; w < maskCanvas.width; w++) {
            const [r1, g1, b1, a1] = imageCanvasColors.slice(
              (h * maskCanvas.width + w) * 4,
              (h * maskCanvas.width + w + 1) * 4
            )
            if (this.isWhite(r1, g1, b1, a1)) {
              continue
            }
            const [r2, g2, b2, a2] = maskCanvasColors.slice(
              (h * maskCanvas.width + w) * 4,
              (h * maskCanvas.width + w + 1) * 4
            )
            if (this.shouldBeMasked && !this.isOnMask(r2, g2, b2, a2)) {
              continue
            }
            targetArea[h][w] = true
          }
        }

        for (let h = this.plotSizePx; h < this.canvasHeightInt; h++) {
          for (let w = this.plotSizePx; w < this.canvasWidthInt; w++) {
            // INFO: 背景色白色はスキップ
            if (!targetArea[h][w]) {
              continue
            }
            const imageData = imageCanvasCtx.getImageData(
              w - this.plotRadiusSizePx,
              h - this.plotRadiusSizePx,
              this.plotSizePx,
              this.plotSizePx
            ).data
            if (this.matchShapeAndColor(imageData)) {
              this.plots.push({
                id: this.nextPlotId,
                xPx: w,
                yPx: h,
              })
              for (let i = 0; i < this.plotSizePx; i++) {
                for (let j = 0; j < this.plotSizePx; j++) {
                  if (i + j === 0) {
                    continue
                  }
                  targetArea[h + j][w - i] = false
                  targetArea[h + j][w + i] = false
                }
              }
            }
          }
        }
        this.sortPlots()
        const allCount = this.canvasWidthInt * this.canvasHeightInt
        console.info('all count:', allCount)
        const searchedCount = targetArea.reduce((prev, cur) => {
          return prev + cur.filter((item) => item).length
        }, 0)
        console.info(
          'searched count:',
          searchedCount,
          '(' + Math.round((searchedCount / allCount) * 1000) / 10 + '%)'
        )
        console.info('extracted count: ', this.plots.length)
        this.shouldShowPoints = true
      } finally {
        const end_ms = new Date().getTime()
        console.info('time:', end_ms - begin_ms + 'ms')
        this.isExtracting = false
      }
    },
    matchShapeAndColor(colors: Uint8ClampedArray): boolean {
      const countColors = colors.length / 4
      const sideLength = Math.sqrt(countColors)
      const [rList, gList, bList] = [[], [], []] as number[][]
      const symbolArray = this.symbol.toArray().data
      for (let h = 0; h < sideLength; h++) {
        for (let w = 0; w < sideLength; w++) {
          if (!symbolArray[h][w]) {
            continue
          }
          rList.push(colors[(h * sideLength + w) * 4])
          gList.push(colors[(h * sideLength + w) * 4 + 1])
          bList.push(colors[(h * sideLength + w) * 4 + 2])
        }
      }
      const color = {
        R: rList.reduce((prev, cur) => prev + cur, 0) / rList.length,
        G: gList.reduce((prev, cur) => prev + cur, 0) / gList.length,
        B: bList.reduce((prev, cur) => prev + cur, 0) / bList.length,
      }
      return this.diffColor(color, this.targetColor) < this.colorDistancePct
    },
    // TODO: 背景色をスキップするか選択できるようにする
    isOnMask(r: number, g: number, b: number, a: number): boolean {
      return r === 255 && g === 255 && b === 0 && a > 0
    },
    isWhite(r: number, g: number, b: number, a: number): boolean {
      return r === 255 && g === 255 && b === 255 && a > 0
    },
    diffColor(
      color1: { R: number; G: number; B: number },
      color2: { R: number; G: number; B: number }
    ): number {
      return diff.diff(diff.rgb_to_lab(color1), diff.rgb_to_lab(color2))
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
    async pickColor(e: MouseEvent) {
      const imageCanvas = document.getElementById(
        'imageCanvas'
      ) as HTMLCanvasElement
      const ctx = imageCanvas.getContext('2d') as CanvasRenderingContext2D
      const colors = ctx.getImageData(
        e.offsetX - magicNumberPx,
        e.offsetY - magicNumberPx,
        1,
        1
      ).data
      const color = colors.slice(0, 3).reduce((prev, cur) => {
        let hex = cur.toString(16)
        if (hex.length === 1) {
          hex = '0' + hex
        }
        return prev + hex
      }, '#')
      this.colorPicker = color
      this.isColorPickerMode = false
    },
    // REFACTOR: modeに応じてplotなりpickColorなりを呼び出す形に変更する
    plot(e: MouseEvent): void {
      if (this.isColorPickerMode) {
        this.pickColor(e)
        return
      }
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
      if (!this.axesIsSet) {
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
    calculateXY(x: number, y: number): { xV: number; yV: number } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!this.axesIsSet) {
        return { xV: 0, yV: 0 }
      }
      // INFO: 点x1と点x2を通る直線が、点tと垂直に交わる点の(x,y)値を計算
      const calculateVerticalCrossPoint = (
        x1x: number,
        x1y: number,
        x2x: number,
        x2y: number,
        tx: number,
        ty: number
      ): { x: number; y: number } => {
        const isParallel = x2y - x1y === 0
        const isVertical = x2x - x1x === 0
        const x = isParallel
          ? tx
          : (x2x * x1y * (x1y - x2y - ty) +
              x1x * x2y * (x2y - x1y - ty) +
              tx * (x2x - x1x) ** 2 +
              ty * (x1x * x1y + x2x * x2y)) /
            ((x2x - x1x) ** 2 + (x2y - x1y) ** 2)
        // INFO: a1 = x1x, a2 = x2x, b1 = x1y, b2 = x2y
        const y = isVertical
          ? ty
          : ((x2y - x1y) * x + x2x * x1y - x1x * x2y) / (x2x - x1x)
        return { x, y }
      }
      const [x1x, x1y, x2x, x2y, x1v, x2v, y1x, y1y, y2x, y2y, y1v, y2v] = [
        this.axesPos[indexX1].xPx,
        this.axesPos[indexX1].yPx,
        this.axesPos[indexX2].xPx,
        this.axesPos[indexX2].yPx,
        parseFloat(this.axesValues.x1),
        parseFloat(this.axesValues.x2),
        this.axesPos[indexY1].xPx,
        this.axesPos[indexY1].yPx,
        this.axesPos[indexY2].xPx,
        this.axesPos[indexY2].yPx,
        parseFloat(this.axesValues.y1),
        parseFloat(this.axesValues.y2),
      ]
      const xPx = calculateVerticalCrossPoint(x1x, x1y, x2x, x2y, x, y).x
      const yPx = calculateVerticalCrossPoint(y1x, y1y, y2x, y2y, x, y).y
      const xV = this.xIsLog
        ? Math.pow(
            10,
            ((xPx - x1x) / (x2x - x1x)) * (Math.log10(x2v) - Math.log10(x1v)) +
              Math.log10(x1v)
          )
        : ((xPx - x1x) / (x2x - x1x)) * (x2v - x1v) + x1v
      const yV = this.yIsLog
        ? Math.pow(
            10,
            ((yPx - y1y) / (y2y - y1y)) * (Math.log10(y2v) - Math.log10(y1v)) +
              Math.log10(y1v)
          )
        : ((yPx - y1y) / (y2y - y1y)) * (y2v - y1v) + y1v
      return { xV, yV }
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
      // INFO: 左クリックされるてる状態
      if (e.buttons === 1 && this.maskMode === 1) {
        return this.draw(e.offsetX, e.offsetY)
      }
      this.cursorOnFilterCanvas = { xPx: 0, yPx: 0 }
    },
    draw(xPx: number, yPx: number) {
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
    },
  },
})
</script>
