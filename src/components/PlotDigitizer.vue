<template>
  <v-container>
    <v-file-input
      accept="image/*"
      label="file input"
      @change="loadImage"
    ></v-file-input>
    <template v-if="uploadImageUrl">
      <v-row>
        <v-col cols="9">
          <v-btn @click="drawActualSizeCanvas">100%</v-btn>
          <v-btn @click="drawFitSizeCanvas">Fit</v-btn>
          <div :style="{ position: 'relative' }" id="wrapper">
            <canvas
              id="canvas"
              :style="{
                cursor: 'crosshair',
                'user-drag': 'none',
                border: 'solid 1px grey',
              }"
              :src="uploadImageUrl"
              @click="plot"
              @mousemove="mouseMove"
            ></canvas>
            <div>
              <v-btn :disabled="coordAxes.length === 0" @click="clearAxes">
                Clear Axes</v-btn
              >
              <!-- TODO: プロットの透明度を変更できるようにする -->
              <!-- TODO: プロットの色を変更できるようにする -->
              <v-btn :disabled="plots.length === 0" @click="clearPoints"
                >Clear Plots</v-btn
              >
              <v-btn
                :disabled="plots.length === 0"
                @click="shouldShowPoints = !shouldShowPoints"
                >{{ shouldShowPoints ? 'Hide Plots' : 'Show Plots' }}</v-btn
              >
            </div>
            <div v-for="(axis, index) in coordAxes" :key="'coordAxes' + index">
              <canvas-axes
                :axesSize="axesSizePx"
                :axis="axis"
                :color="coordAxes.length === 4 ? 'black' : 'red'"
                :index="index"
                :label="showAxisName(index)"
              ></canvas-axes>
            </div>
            <div v-for="plot in plots" v-show="shouldShowPoints" :key="plot.id">
              <canvas-plot :plotSize="plotSizePx" :plot="plot"></canvas-plot>
            </div>
            <canvas-cursor
              v-if="coordAxes.length < 4"
              :cursor="canvasCursor"
              :label="showAxisName(coordAxes.length)"
            ></canvas-cursor>
          </div>
          {{ plots.length }}
          <plots-table
            v-if="plots.length > 0 && coordAxes.length === 4"
            :plots="calculatedPlots"
          ></plots-table>
        </v-col>
        <v-col cols="3">
          <div
            :style="{
              overflow: 'hidden',
              width: `${magnifierSizePx}px`,
              height: `${magnifierSizePx}px`,
              position: 'relative',
              border: '1px solid grey',
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
                :color="coordAxes.length === 4 ? 'black' : 'red'"
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
              ></magnifier-plots>
            </div>
          </div>
          <div v-if="coordAxes.length === 4">
            {{ `x: ${calculateXY(canvasCursor.xPx, canvasCursor.yPx).xV}`
            }}<br />
            {{ `y: ${calculateXY(canvasCursor.xPx, canvasCursor.yPx).yV}` }}
          </div>
          <v-slider
            v-model="magnifierScale"
            thumb-label="always"
            max="10"
            min="2"
            label="Magnification"
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
          <h3>Automatic Extraction</h3>
          <div
            :style="{
              'pointer-events': 'none',
              width: `${plotSizePx}px`,
              height: `${plotSizePx}px`,
              'border-radius': '50%',
              'background-color': 'red',
            }"
          ></div>
          <v-slider
            v-model="plotSizePx"
            thumb-label="always"
            max="20"
            min="1"
            label="Plot Size"
            thumb-size="25"
          ></v-slider>
          <v-slider
            v-model="colorDistancePct"
            thumb-label="always"
            max="100"
            min="1"
            label="Color Distsance"
            thumb-size="25"
          ></v-slider>
          <v-color-picker v-model="colorPicker" class="ma-2"></v-color-picker>
          <v-btn :loading="isDetecting" @click="detectPointByColor">Run</v-btn>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import diff from 'color-diff'
import MagnifierVerticalLine from './Magnifier/MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './Magnifier/MagnifierHorizontalLine.vue'
import MagnifierImage from './Magnifier/MagnifierImage.vue'
import MagnifierAxes from './Magnifier/MagnifierAxes.vue'
import MagnifierPlots from './Magnifier/MagnifierPlots.vue'
import CanvasAxes from './Canvas/CanvasAxes.vue'
import CanvasPlot from './Canvas/CanvasPlot.vue'
import CanvasCursor from './Canvas/CanvasCursor.vue'
import PlotsTable from './PlotsTable.vue'

const axesSizePx = 10
const [indexX1, indexX2, indexY1, indexY2] = [0, 1, 2, 3]

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
    PlotsTable,
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
      plotSizePx: 5,
      colorDistancePct: 10,
      colorPicker: '',
      isDetecting: false,
      axesSizePx,
      canvasScale: 1,
      magnifierSizePx: 200,
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
      xV: number
      yV: number
    }[] {
      const newPlots = this.plots.map((plot) => {
        const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
        return {
          id: plot.id,
          xV,
          yV,
        }
      })
      return newPlots
    },
  },
  mounted() {
    // REFACTOR: DRY
    const wrapper: HTMLDivElement | null = document.querySelector('#wrapper')
    const canvas: HTMLCanvasElement | null = document.querySelector('#canvas')
    if (canvas === null || wrapper === null) {
      window.alert('canvas is null')
      return
    }
    const ctx = canvas.getContext('2d')
    const image = new Image()
    image.src = this.uploadImageUrl
    image.onload = () => {
      const wrapperWidthPx = wrapper.offsetWidth
      const imageWidthPx = image.width
      const imageHeightPx = image.height
      const imageRatio = wrapperWidthPx / imageWidthPx
      this.canvasScale = imageRatio
      const wrapperHeightPx = imageHeightPx * imageRatio
      canvas.setAttribute('width', String(wrapperWidthPx))
      canvas.setAttribute('height', String(wrapperHeightPx))
      ctx?.drawImage(image, 0, 0, wrapperWidthPx, wrapperHeightPx)
    }
  },
  created() {},
  methods: {
    drawActualSizeCanvas() {
      // REFACTOR: DRY
      const wrapper: HTMLDivElement | null = document.querySelector('#wrapper')
      const canvas: HTMLCanvasElement | null = document.querySelector('#canvas')
      if (canvas === null || wrapper === null) {
        window.alert('canvas is null')
        return
      }
      const ctx = canvas.getContext('2d')
      const image = new Image()
      image.src = this.uploadImageUrl
      image.onload = () => {
        const imageWidthPx = image.width
        const imageHeightPx = image.height
        canvas.setAttribute('width', String(imageWidthPx))
        canvas.setAttribute('height', String(imageHeightPx))
        ctx?.drawImage(image, 0, 0, imageWidthPx, imageHeightPx)
      }
      if (this.canvasScale !== 1) {
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
      }
    },
    drawFitSizeCanvas() {
      // REFACTOR: DRY
      const wrapper: HTMLDivElement | null = document.querySelector('#wrapper')
      const canvas: HTMLCanvasElement | null = document.querySelector('#canvas')
      if (canvas === null || wrapper === null) {
        window.alert('canvas is null')
        return
      }
      const ctx = canvas.getContext('2d')
      const image = new Image()
      image.src = this.uploadImageUrl
      image.onload = () => {
        const wrapperWidthPx = wrapper.offsetWidth
        const imageWidthPx = image.width
        const imageHeightPx = image.height
        const imageRatio = wrapperWidthPx / imageWidthPx
        const wrapperHeightPx = imageHeightPx * imageRatio
        canvas.setAttribute('width', String(wrapperWidthPx))
        canvas.setAttribute('height', String(wrapperHeightPx))
        ctx?.drawImage(image, 0, 0, wrapperWidthPx, wrapperHeightPx)
        this.plots = this.plots.map((plot) => {
          return {
            id: plot.id,
            xPx: (plot.xPx / this.canvasScale) * imageRatio,
            yPx: (plot.yPx / this.canvasScale) * imageRatio,
          }
        })
        this.coordAxes = this.coordAxes.map((axis) => {
          return {
            xPx: (axis.xPx / this.canvasScale) * imageRatio,
            yPx: (axis.yPx / this.canvasScale) * imageRatio,
          }
        })
        this.plotSizePx = (this.plotSizePx / this.canvasScale) * imageRatio
        this.canvasScale = imageRatio
      }
    },
    // TODO: Change all word detect to extract.
    detectPointByColor() {
      this.clearPoints()
      this.isDetecting = true
      const wrapper: HTMLDivElement | null = document.querySelector('#wrapper')
      const canvas: HTMLCanvasElement | null = document.querySelector('#canvas')
      if (canvas === null || wrapper === null) {
        window.alert('canvas is null')
        return
      }
      const ctx = canvas.getContext('2d')
      const image = new Image()
      image.src = this.uploadImageUrl
      image.onload = () => {
        const wrapperWidthPx = wrapper.offsetWidth
        const imageWidthPx = image.width
        const imageHeightPx = image.height
        const imageRatio = wrapperWidthPx / imageWidthPx
        this.canvasScale = imageRatio
        const wrapperHeightPx = imageHeightPx * imageRatio
        canvas.setAttribute('width', String(wrapperWidthPx))
        canvas.setAttribute('height', String(wrapperHeightPx))
        ctx?.drawImage(image, 0, 0, wrapperWidthPx, wrapperHeightPx)
        const paintedArea = [] as { w: number; h: number }[]
        for (let h = 0; h < wrapperHeightPx; h++) {
          for (let w = 0; w < wrapperWidthPx; w++) {
            if (paintedArea.some((area) => area.w === w && area.h === h)) {
              continue
            }
            const imageData = ctx?.getImageData(
              w,
              h,
              this.plotSizePx,
              this.plotSizePx
            )
            const imageRGB = imageData?.data
            const [rList, gList, bList] = [[], [], []] as number[][]
            if (imageRGB instanceof Uint8ClampedArray) {
              for (let i = 0; i < this.plotSizePx; i++) {
                rList.push(imageRGB[i * 4])
                gList.push(imageRGB[i * 4 + 1])
                bList.push(imageRGB[i * 4 + 2])
              }
            } else {
              throw new TypeError(
                'imageRGB is not instanceof Uint8ClampedArray'
              )
            }
            const calcAverage = (numbers: number[]): number => {
              return (
                numbers.reduce((prev, cur) => prev + cur, 0) / numbers.length
              )
            }
            const canvasColor = {
              R: calcAverage(rList),
              B: calcAverage(bList),
              G: calcAverage(gList),
            }
            if (!imageData) {
              window.alert('カラーの読み込みに失敗')
            } else {
              const colorDiffDistance = this.diffColor(
                canvasColor,
                this.targetColor
              )
              if (colorDiffDistance < this.colorDistancePct) {
                this.plots.push({
                  id: this.plots.length + 1,
                  xPx: w + this.plotRadiusSizePx,
                  yPx: h + this.plotRadiusSizePx,
                })
                for (let i = 0; i < this.plotSizePx; i++) {
                  for (let j = 0; j < this.plotSizePx; j++) {
                    if (i + j === 0) {
                      continue
                    }
                    paintedArea.push({ w: w - i, h: h + j })
                    paintedArea.push({ w: w + i, h: h + j })
                  }
                }
              }
            }
          }
        }
        this.isDetecting = false
      }
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
    loadImage(file: File) {
      const element: HTMLCanvasElement | null =
        document.querySelector('#canvas')
      if (element === null) {
        window.alert('element is null')
        return
      }
      const ctx = element.getContext('2d')
      const image = new Image()

      const fr = new FileReader()
      fr.readAsDataURL(file)
      fr.addEventListener('load', () => {
        if (typeof fr.result === 'string') {
          this.uploadImageUrl = fr.result
          image.src = fr.result
          image.onload = () => {
            const widthPx = image.width
            const heightPx = image.height
            element.setAttribute('width', String(widthPx))
            element.setAttribute('height', String(heightPx))
            ctx?.drawImage(image, 0, 0)
          }
        } else {
          window.alert('string以外の型')
        }
      })
    },
    plot(e: MouseEvent): void {
      if (this.coordAxes.length < 4) {
        this.coordAxes.push({
          xPx: e.offsetX,
          yPx: e.offsetY,
        })
        return
      }
      this.plots.push({
        id: this.plots.length + 1,
        xPx: e.offsetX,
        yPx: e.offsetY,
      })
    },
    calculateXY(x: number, y: number): { xV: number; yV: number } {
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
    clearAxes() {
      this.coordAxes = []
    },
    clearPoints() {
      this.plots = []
      this.shouldShowPoints = true
    },
    mouseMove(e: MouseEvent) {
      this.canvasCursor = {
        xPx: e.offsetX,
        yPx: e.offsetY,
      }
    },
  },
})
</script>
