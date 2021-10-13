<template>
  <v-container>
    <template>
      <v-file-input
        accept="image/*"
        label="file input"
        @change="uploadImage"
        class="ma-0"
      ></v-file-input>
      <v-row>
        <v-col cols="9">
          <v-btn @click="resizeCanvasToMax">100%</v-btn>
          <v-btn @click="resizeCanvasToFit">Fit</v-btn>
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
            <canvas id="canvas" :style="{}" :src="uploadImageUrl"></canvas>
            <div v-for="(axis, index) in coordAxes" :key="'coordAxes' + index">
              <canvas-axes
                :axesSize="axesSizePx"
                :axis="axis"
                :color="
                  isMovingAxis && movingAxisIndex === index
                    ? 'limegreen'
                    : axesColor
                "
                :index="index"
                :label="showAxisName(index)"
              ></canvas-axes>
            </div>
            <canvas-plot
              id="canvas-plot"
              v-for="plot in plots"
              v-show="shouldShowPoints"
              :key="plot.id"
              :plotSize="plotSizePx"
              :plot="plot"
              :color="
                isMovingPlot && movingPlotId === plot.id
                  ? 'limegreen'
                  : plotsColor
              "
              :activatePlot="activatePlot"
            ></canvas-plot>
            <canvas-cursor
              v-if="coordAxes.length < 4 && !cursorIsMoved"
              :cursor="canvasCursor"
              :label="showAxisName(coordAxes.length)"
            ></canvas-cursor>
          </div>
          <div>
            <v-btn text :disabled="coordAxes.length === 0" @click="clearAxes">
              Clear Axes</v-btn
            >
            <v-btn text :disabled="plots.length === 0" @click="clearPoints"
              >Clear Plots</v-btn
            >
            <v-btn
              text
              :disabled="coordAxes.length === 0 || !isMovingAxis"
              @click="removeAxis"
              >Clear Active Axis</v-btn
            >
            <v-btn
              text
              :disabled="plots.length === 0 || !isMovingPlot"
              @click="removePlot"
              >Clear Active Plot</v-btn
            >
            <v-btn
              text
              :disabled="plots.length === 0"
              @click="shouldShowPoints = !shouldShowPoints"
              >{{ shouldShowPoints ? 'Hide Plots' : 'Show Plots' }}</v-btn
            >
          </div>
          {{ plots.length }}
          <!-- REFACTOR: make the table component -->
          <v-simple-table>
            <thead>
              <tr>
                <th>x (px)</th>
                <th>y (px)</th>
                <th>x (value)</th>
                <th>y (value)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plot in calculatedPlots" :key="plot.id">
                <td>{{ plot.xPx }}</td>
                <td>{{ plot.yPx }}</td>
                <td>{{ plot.xV }}</td>
                <td>{{ plot.yV }}</td>
              </tr>
            </tbody>
          </v-simple-table>
          <div v-if="!hideCSVText">
            <v-textarea
              readonly
              v-model="convertPlotsIntoText"
              outlined
              hide-details="true"
            ></v-textarea>
            <v-btn
              @click="copy"
              text
              :disabled="convertPlotsIntoText.length === 0"
              >Copy to Clipboard</v-btn
            >
          </div>
        </v-col>
        <v-col cols="3">
          <div
            :style="{
              overflow: 'hidden',
              width: `${magnifierSizePx}px`,
              height: `${magnifierSizePx}px`,
              position: 'relative',
              outline: '1px solid grey',
            }"
          >
            <magnifier-image
              :src="uploadImageUrl"
              :scale="magnifierScale"
              :cursorX="canvasCursor.xPx / canvasScale"
              :cursorY="canvasCursor.yPx / canvasScale"
              :size="magnifierSizePx"
            ></magnifier-image>
            <magnifier-vertical-line
              :magnifierSize="magnifierSizePx"
            ></magnifier-vertical-line>
            <magnifier-horizontal-line
              :magnifierSize="magnifierSizePx"
            ></magnifier-horizontal-line>
            <div v-for="(axis, index) in coordAxes" :key="'coordAxes' + index">
              <magnifier-axes
                :axis="axis"
                :color="
                  isMovingAxis && movingAxisIndex === index
                    ? 'limegreen'
                    : axesColor
                "
                :index="index"
                :axesSize="axesSizePx"
                :canvasScale="canvasScale"
                :canvasCursor="canvasCursor"
                :magnifierScale="magnifierScale"
                :magnifierSize="magnifierSizePx"
                :label="showAxisName(index)"
              ></magnifier-axes>
            </div>
            <div v-for="plot in plots" v-show="shouldShowPoints" :key="plot.id">
              <magnifier-plots
                :magnifierScale="magnifierScale"
                :canvasScale="canvasScale"
                :cursor="canvasCursor"
                :plotSize="plotSizePx"
                :plot="plot"
                :magnifierSize="magnifierSizePx"
                :color="
                  isMovingPlot && movingPlotId === plot.id
                    ? 'limegreen'
                    : plotsColor
                "
              ></magnifier-plots>
            </div>
          </div>
          <!-- REFACTOR: make the table component -->
          <v-simple-table dense>
            <thead>
              <tr>
                <th></th>
                <th>px</th>
                <th>value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>X</th>
                <td>{{ canvasCursor.xPx }}</td>
                <td>
                  {{ calculateXY(canvasCursor.xPx, canvasCursor.yPx).xV }}
                </td>
              </tr>
              <tr>
                <th>Y</th>
                <td>
                  {{ canvasCursor.yPx }}
                </td>
                <td>
                  {{ calculateXY(canvasCursor.xPx, canvasCursor.yPx).yV }}
                </td>
              </tr>
            </tbody>
          </v-simple-table>
          <v-slider
            v-model="magnifierScale"
            thumb-label="always"
            max="10"
            min="2"
            label="Magnifier"
            thumb-size="25"
          ></v-slider>
          <h3>Axes Values</h3>
          <v-row>
            <v-col vols="6" class="ma-0 pb-0">
              <v-text-field
                v-model="coordAxesValue[indexX1]"
                label="x1"
                type="number"
              ></v-text-field>
            </v-col>
            <v-col vols="6" class="ma-0 pb-0">
              <v-text-field
                v-model="coordAxesValue[indexX2]"
                label="x2"
                type="number"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col vols="6" class="ma-0 pt-0">
              <v-text-field
                v-model="coordAxesValue[indexY1]"
                label="y1"
                type="number"
              ></v-text-field>
            </v-col>
            <v-col vols="6" class="ma-0 pt-0">
              <v-text-field
                v-model="coordAxesValue[indexY2]"
                label="y2"
                type="number"
              ></v-text-field>
            </v-col>
          </v-row>
          <h3>
            Automatic Extraction<v-btn
              text
              class="ml-2"
              :loading="isExtracting"
              @click="extractPlotsByColor"
              color="green"
              >Run</v-btn
            >
          </h3>
          <v-checkbox
            v-model="shouldClearPlots"
            label="clear plots"
            class="mt-0"
          ></v-checkbox>
          <div
            :style="{
              'pointer-events': 'none',
              width: `${plotSizePx}px`,
              height: `${plotSizePx}px`,
              'border-radius': '50%',
              'background-color': plotsColor,
            }"
          ></div>
          <v-slider
            v-model="plotSizePx"
            thumb-label="always"
            max="30"
            min="4"
            label="Plot Size"
            thumb-size="25"
          ></v-slider>
          <v-slider
            v-model="colorDistancePct"
            thumb-label="always"
            max="20"
            min="1"
            label="Color Distsance"
            thumb-size="25"
          ></v-slider>
          <v-color-picker
            v-model="colorPicker"
            hide-canvas
            hide-inputs
            show-swatches
            :swatches="swatches"
            class="ma-2"
          ></v-color-picker>
          <h3 class="mt-4">Plots Color</h3>
          <v-color-picker
            v-model="plotsColor"
            class="mb-2"
            hide-canvas
            hide-inputs
          ></v-color-picker>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import diff from 'color-diff'
import ColorThief from 'colorthief'
// REFACTOR: まとめてimportする
import MagnifierVerticalLine from './Magnifier/MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './Magnifier/MagnifierHorizontalLine.vue'
import MagnifierImage from './Magnifier/MagnifierImage.vue'
import MagnifierAxes from './Magnifier/MagnifierAxes.vue'
import MagnifierPlots from './Magnifier/MagnifierPlots.vue'
import CanvasAxes from './Canvas/CanvasAxes.vue'
import CanvasPlot from './Canvas/CanvasPlot.vue'
import CanvasCursor from './Canvas/CanvasCursor.vue'

const axesSizePx = 10
const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3]
const [black, red] = ['#000000ff', '#ff0000ff']
const adjustMagicNumberPx = -2
const colorThief = new ColorThief()

export default Vue.extend({
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxes,
    MagnifierPlots,
    CanvasAxes,
    CanvasPlot,
    CanvasCursor,
  },
  props: {
    hideCSVText: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      uploadImageUrl: '/img/sample_graph.png',
      coordAxes: [] as {
        xPx: number
        yPx: number
      }[],
      coordAxesValue: [0, 1, 0, 1] as number[],
      canvasCursor: {
        xPx: 0,
        yPx: 0,
      },
      color: 'red',
      magnifierScale: 5,
      plots: [] as { id: number; xPx: number; yPx: number }[],
      indexX1,
      indexX2,
      indexY1,
      indexY2,
      colors: [] as { R: number; G: number; B: number }[][],
      shouldShowPoints: true,
      plotSizePx: 6,
      colorDistancePct: 5,
      colorPicker: '',
      isExtracting: false,
      axesSizePx,
      canvasScale: 1,
      magnifierSizePx: 200,
      // REFACTOR: 変数名を変更 → axesIsActive
      isMovingAxis: false,
      cursorIsMoved: false,
      movingAxisIndex: 0,
      isMovingPlot: false,
      movingPlotId: 0,
      axesColor: black,
      plotsColor: red,
      canvasWidth: 0,
      canvasHeight: 0,
      swatches: [...Array(5)].map(() => []) as string[][],
      isFit: true,
      shouldClearPlots: true,
    }
  },
  computed: {
    targetColor(): { R: number; G: number; B: number } {
      return {
        R: parseInt(this.colorPicker.slice(1, 3), 16),
        G: parseInt(this.colorPicker.slice(3, 5), 16),
        B: parseInt(this.colorPicker.slice(5, 7), 16),
      }
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
          xV,
          yV,
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
          return prev + `${cur.xPx}, ${cur.yPx}, ${cur.xV}, ${cur.yV}\n`
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
  },
  async mounted() {
    try {
      const wrapper = await this.getWrapperElement()
      const canvas = await this.getCanvasElement()
      const ctx = await this.getContext2D(canvas)
      const image = await this.loadImage(this.uploadImageUrl)
      this.drawImage(wrapper, canvas, image, ctx)
      this.updateSwatches(image)
    } catch (error) {
      console.error('failed mounted script', error)
    } finally {
      //
    }
    document.addEventListener('keydown', this.keyListener.bind(this))
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyListener)
  },
  methods: {
    copy() {
      navigator.clipboard.writeText(this.convertPlotsIntoText)
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
            this.coordAxes[this.movingAxisIndex].yPx--
            break
          case arrowRight:
            this.coordAxes[this.movingAxisIndex].xPx++
            break
          case arrowDown:
            this.coordAxes[this.movingAxisIndex].yPx++
            break
          case arrowLeft:
            this.coordAxes[this.movingAxisIndex].xPx--
            break
          default:
            break
        }
        this.canvasCursor = this.coordAxes[this.movingAxisIndex]
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
        const wrapper = await this.getWrapperElement()
        const canvas = await this.getCanvasElement()
        const ctx = await this.getContext2D(canvas)
        const image = await this.loadImage(this.uploadImageUrl)
        this.drawImage(wrapper, canvas, image, ctx)
        this.plots = this.plots.map((plot) => {
          return {
            id: plot.id,
            xPx: plot.xPx / this.canvasScale,
            yPx: plot.yPx / this.canvasScale,
          }
        })
        this.coordAxes = this.coordAxes.map((axis) => {
          return {
            xPx: axis.xPx / this.canvasScale,
            yPx: axis.yPx / this.canvasScale,
          }
        })
        this.plotSizePx = this.plotSizePx / this.canvasScale
        this.canvasScale = 1
      } catch (error) {
        window.alert(error)
      } finally {
        //
      }
    },
    async resizeCanvasToFit() {
      this.isFit = true
      try {
        const wrapper = await this.getWrapperElement()
        const canvas = await this.getCanvasElement()
        const ctx = await this.getContext2D(canvas)
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
        this.coordAxes = this.coordAxes.map((axis) => {
          return {
            xPx: (axis.xPx * this.canvasScale) / prevCanvasScale,
            yPx: (axis.yPx * this.canvasScale) / prevCanvasScale,
          }
        })
        this.plotSizePx = (this.plotSizePx * this.canvasScale) / prevCanvasScale
      } catch (error) {
        window.alert(error)
      } finally {
        //
      }
    },
    async extractPlotsByColor() {
      const begin_ms = new Date().getTime()
      this.isExtracting = true
      if (this.shouldClearPlots) {
        this.plots = []
      }
      try {
        const wrapper = await this.getWrapperElement()
        const canvas = await this.getCanvasElement()
        const ctx = await this.getContext2D(canvas)
        const image = await this.loadImage(this.uploadImageUrl)
        this.drawImage(wrapper, canvas, image, ctx)
        const data = ctx.getImageData(
          0,
          0,
          this.canvasHeight,
          this.canvasWidth
        ).data
        const targetArea = [...Array(this.canvasHeightInt)].map(() =>
          Array(this.canvasWidthInt).fill(true)
        )
        for (let h = 0; h < this.canvasHeight; h++) {
          for (let w = 0; w < this.canvasWidth; w++) {
            const [r, g, b, a] = data.slice(
              (h * this.canvasWidth + w) * 4,
              (h * this.canvasWidth + w + 1) * 4
            )
            if (this.isWhite(r, g, b, a)) {
              targetArea[h][w] = false
            }
          }
        }
        for (let h = this.plotSizePx; h < this.canvasHeightInt; h++) {
          // if (h === this.plotSizePx + 300) return
          for (let w = this.plotSizePx; w < this.canvasWidthInt; w++) {
            // INFO: 背景色白色はスキップ
            if (!targetArea[h][w]) {
              continue
            }
            const imageData = ctx.getImageData(
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
        console.info(
          'target count:',
          this.canvasWidthInt * this.canvasHeightInt
        )
        console.info(
          'skipped count:',
          targetArea.reduce((prev, cur) => {
            return prev + cur.filter((item) => !item).length
          }, 0)
        )
      } catch (error) {
        console.error(error)
      } finally {
        const end_ms = new Date().getTime()
        console.info('time:', end_ms - begin_ms + 'ms')
        this.isExtracting = false
      }
    },
    matchShapeAndColor(colors: Uint8ClampedArray): boolean {
      const countColors = colors.length / 4
      const sideLength = Math.sqrt(countColors)
      // INFO: 対象が円だとした場合、emptyLengthのエリアは円かどうかが入り混じっている
      const emptyLength = Math.ceil(((2 - Math.sqrt(2)) / 4) * sideLength)
      const actualSideLength = sideLength - emptyLength * 2
      const [rList, gList, bList] = [[], [], []] as number[][]
      for (let h = emptyLength; h < actualSideLength + emptyLength; h++) {
        for (let w = emptyLength; w < actualSideLength + emptyLength; w++) {
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
    isWhite(r: number, g: number, b: number, a: number): boolean {
      return (r + g + b + a) / 4 === 255
    },
    diffColor(
      color1: { R: number; G: number; B: number },
      color2: { R: number; G: number; B: number }
    ): number {
      return diff.diff(diff.rgb_to_lab(color1), diff.rgb_to_lab(color2))
    },
    changeColor(color: string) {
      this.color = color
    },
    async uploadImage(file: File) {
      try {
        const wrapper = await this.getWrapperElement()
        const canvas = await this.getCanvasElement()
        const ctx = await this.getContext2D(canvas)
        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        const image = await this.loadImage(fr.result)
        this.drawImage(wrapper, canvas, image, ctx)
        this.updateSwatches(image)
        this.uploadImageUrl = fr.result
      } catch (error) {
        window.alert(error)
      } finally {
        //
      }
    },
    getCanvasElement(): Promise<HTMLCanvasElement> {
      return new Promise((resolve, reject) => {
        const canvas = document.querySelector<HTMLCanvasElement>('#canvas')
        if (canvas === null) {
          reject('canvas is null')
        } else {
          resolve(canvas)
        }
      })
    },
    getWrapperElement(): Promise<HTMLDivElement> {
      return new Promise((resolve, reject) => {
        const wrapper = document.querySelector<HTMLDivElement>('#wrapper')
        if (wrapper === null) {
          reject('wrapper is null')
        } else {
          resolve(wrapper)
        }
      })
    },
    getContext2D(canvas: HTMLCanvasElement): Promise<CanvasRenderingContext2D> {
      return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d')
        if (ctx === null) {
          reject('ctx is null')
        } else {
          resolve(ctx)
        }
      })
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
      ctx.drawImage(
        image,
        adjustMagicNumberPx,
        0,
        wrapperWidthPx,
        wrapperHeightPx
      )
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
      ctx.drawImage(image, adjustMagicNumberPx, 0, imageWidthPx, imageHeightPx)
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
    plot(e: MouseEvent): void {
      const target = e.target as HTMLElement
      const isOnCanvas = target.id === 'canvas'
      const isOnCanvasPlot = target.id === 'canvas-plot'
      // INFO: canvas-plot element上の時は、plot edit modeになるので
      if (isOnCanvasPlot) {
        return
      }
      if (this.coordAxes.length < 4) {
        this.isMovingAxis = true
        this.cursorIsMoved = false
        this.movingAxisIndex = this.coordAxes.length
        this.coordAxes.push({
          xPx: isOnCanvas
            ? e.offsetX
            : e.offsetX + parseFloat(target.style.left),
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
        xPx: isOnCanvas ? e.offsetX : e.offsetX + parseFloat(target.style.left),
        yPx: isOnCanvas ? e.offsetY : e.offsetY + parseFloat(target.style.top),
      })
      this.shouldShowPoints = true
    },
    calculateXY(x: number, y: number): { xV: number; yV: number } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (this.coordAxes.length !== 4) {
        return { xV: 0, yV: 0 }
      }
      // INFO: 点x1と点x2を通る直線が、点tと垂直に交わる点のx値を計算
      const calculateVerticalCrossPoint = (
        x1x: number,
        x1y: number,
        x2x: number,
        x2y: number,
        tx: number,
        ty: number
      ): number => {
        return (
          (x2x * x1y * (x1y - x2y - ty) +
            x1x * x2y * (x2y - x1y - ty) +
            tx * (x2x - x1x) ** 2 +
            ty * (x1x * x1y + x2x * x2y)) /
          ((x2x - x1x) ** 2 + (x2y - x1y) ** 2)
        )
      }
      const [x1x, x1y, x2x, x2y, x1v, x2v, y1x, y1y, y2x, y2y, y1v, y2v] = [
        this.coordAxes[indexX1].xPx,
        this.coordAxes[indexX1].yPx,
        this.coordAxes[indexX2].xPx,
        this.coordAxes[indexX2].yPx,
        this.coordAxesValue[indexX1],
        this.coordAxesValue[indexX2],
        this.coordAxes[indexY1].xPx,
        this.coordAxes[indexY1].yPx,
        this.coordAxes[indexY2].xPx,
        this.coordAxes[indexY2].yPx,
        this.coordAxesValue[indexY1],
        this.coordAxesValue[indexY2],
      ]
      const xPx = calculateVerticalCrossPoint(x1x, x1y, x2x, x2y, x, y)
      const yPx = calculateVerticalCrossPoint(y1x, y1y, y2x, y2y, x, y)
      const xV = ((xPx - x1x) / (x2x - x1x)) * (x2v - x1v) + x1v
      const yV = ((yPx - y1x) / (y2x - y1x)) * (y2v - y1v) + y1v
      return { xV, yV }
    },
    showAxisName(index: number): string {
      switch (index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          return '-'
      }
    },
    activatePlot(id: number) {
      this.movingPlotId = id
      this.isMovingPlot = true
    },
    clearAxes() {
      this.coordAxes = []
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
      this.coordAxes.pop()
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
        xPx: isOnCanvas ? e.offsetX : e.offsetX + parseFloat(target.style.left),
        yPx: isOnCanvas ? e.offsetY : e.offsetY + parseFloat(target.style.top),
      }
    },
  },
})
</script>
