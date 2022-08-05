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
          <axes-settings></axes-settings>
          <dataset-manager :exportBtnText="exportBtnText"></dataset-manager>
        </v-col>
        <v-col class="pt-1" cols="7">
          <canvas-header :uploadImage="uploadImage"></canvas-header>
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
            <!-- TODO: uploadImageUrlはCanvasで描画してるのでdataプロパティ上は不要 -->
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
            <canvas-axes></canvas-axes>
            <canvas-plots
              v-show="shouldShowPoints"
              :plotSizePx="plotSizePx"
              :isActive="datasets.activePlotIds.includes(plot.id)"
            >
            </canvas-plots>
            <canvas-cursor
              :cursor="showCanvasCursor"
              :label="cursorLabel"
              :shouldShowLabel="shouldShowLabel"
            ></canvas-cursor>
          </div>
          <canvas-footer
            :shouldShowPoints="shouldShowPoints"
            :clearAxes="clearAxes"
            :switchShowPlots="switchShowPlots"
          ></canvas-footer>
        </v-col>
        <v-col class="pt-1" cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier
            :uploadImageUrl="uploadImageUrl"
            :canvasCursor="showCanvasCursor"
            :plotSizePx="plotSizePx"
            :activePlotIds="datasets.activePlotIds"
            :shouldShowPoints="shouldShowPoints"
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
  CanvasPlots,
  CanvasCursor,
} from './Canvas'
import {
  Position,
  DiameterRange,
  ExtractAlgorithm,
  LineExtractProps,
} from '../types'
import SymbolExtractByArea from '@/domains/extractStrategies/SymbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/LineExtract'
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
import { Canvas } from '@/domains/canvas'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'
import { axesMapper } from '@/store/modules/axes'

const [black] = ['#000000ff']
// INFO: to adjust the exact position the user clicked.
const offsetPx = 1
const cm = Canvas.instance
const extractAlgorithms = ['Symbol Extract', 'Line Extract'] as const

export default Vue.extend({
  components: {
    Magnifier,
    CanvasAxes,
    CanvasPlots,
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
      shouldShowLabel: true,
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
      maskMode: -1,
      uploadImageUrl: '',
      canvasCursor: {
        xPx: 0,
        yPx: 0,
      } as Position,
      // REFACTOR: color typeを作成する
      colors: [] as { R: number; G: number; B: number }[][],
      shouldShowPoints: true,
      colorDistancePct: 5,
      colorPicker: black,
      isExtracting: false,
      plotSizePx: 10,
      cursorIsMoved: false,
      canvasWidth: 0,
      canvasHeight: 0,
      swatches: [...Array(5)].map(() => []) as string[][],
      isDrawnMask: cm.isDrawnMask,
      penToolSize: 50,
      eraserSize: 30,
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
    showCanvasCursor(): Position {
      return {
        xPx: this.canvasCursor.xPx * this.canvas.scale,
        yPx: this.canvasCursor.yPx * this.canvas.scale,
      }
    },
    showPenToolSize(): number {
      return this.penToolSize * this.canvas.scale
    },
    showEraserSize(): number {
      return this.eraserSize * this.canvas.scale
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
      return this.axes.nextAxisKey
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
    document.addEventListener('keydown', this.keyDownHandler.bind(this))
    document.addEventListener('paste', this.pasteHandler.bind(this))
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
      this.drawFitSizeImage()
      this.uploadImageUrl = this.initialGraphImagePath
      this.canvasWidth = cm.imageCanvas.width
      this.canvasHeight = cm.imageCanvas.height
      this.updateSwatches(cm.colorSwatches)
    } finally {
      //
    }
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyDownHandler)
    document.removeEventListener('paste', this.pasteHandler)
  },
  methods: {
    ...datasetMapper.mapActions([
      'addPlot',
      'moveActivePlot',
      'clearPlots',
      'setPlots',
    ]),
    ...canvasMapper.mapActions(['drawFitSizeImage']),
    setMaskMode(mode: number) {
      this.maskMode = mode
    },
    ...axesMapper.mapActions([
      'clearAxes',
      'addAxis',
      'moveActiveAxis',
      'inactivateAxis',
    ]),
    setPenToolSize(size: string) {
      this.penToolSize = parseInt(size)
    },
    setEraserSize(size: string) {
      this.eraserSize = parseInt(size)
    },
    // TODO: setSymbolExtractPropsに変更する
    setDiameterRange(diameterRange: DiameterRange) {
      this.diameterRange = diameterRange
    },
    setLineExtractProps(props: LineExtractProps) {
      this.lineExtractProps = props
    },
    switchShowPlots(): void {
      this.shouldShowPoints = !this.shouldShowPoints
    },
    sortPlots() {
      this.datasets.activeDataset.plots.sort((a, b) => {
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
    keyDownHandler(e: KeyboardEvent) {
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
      if (this.axes.isActive) {
        this.shouldShowLabel = false
        this.moveActiveAxis(key)
        this.canvasCursor = this.axes.activeAxis
      }
      if (this.datasets.plotsAreActive) {
        this.moveActivePlot(e.key)
        this.canvasCursor = this.datasets.activeDataset.plots.filter((plot) =>
          this.datasets.activePlotIds.includes(plot.id)
        )[0]
      }
    },
    pasteHandler(event: ClipboardEvent) {
      if (!event.clipboardData) {
        return
      }
      if (!event.clipboardData.items) {
        return
      }
      const items = event.clipboardData.items
      if (items[0].type.indexOf('image') === -1) {
        return
      }
      const imageFile = items[0].getAsFile()
      if (!imageFile) {
        return
      }
      this.uploadImage(imageFile)
    },
    async extractPlots() {
      this.isExtracting = true
      this.inactivateAxis()
      this.clearPlots()
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
        this.setPlots(
          extractor.execute(
            cm,
            [this.targetColor.R, this.targetColor.G, this.targetColor.B],
            this.colorDistancePct,
            this.isDrawnMask
          )
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
        // TODO: Canvasを利用する
        const image = await this.loadImage(fr.result)
        cm.changeImage(image)
        this.drawFitSizeImage()
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
      if (this.axes.hasNext) {
        this.addAxis({
          xPx: (e.offsetX - offsetPx) / this.canvas.scale,
          yPx: e.offsetY / this.canvas.scale,
        })
        return
      }

      this.addPlot({
        xPx: (e.offsetX - offsetPx) / this.canvas.scale,
        yPx: e.offsetY / this.canvas.scale,
      })
      this.inactivateAxis()
      this.shouldShowPoints = true
    },
    clearAxes() {
      this.clearAxes()
    },
    mouseMove(e: MouseEvent) {
      // INFO: プロットの上のoffsetX, Yはプロット(div Element)の中でのXY値になるため、styleのtopとleftを足すことで、canvas上のxy値を再現してる
      const target = e.target as HTMLElement
      const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
      const yPx = e.offsetY + parseFloat(target.style.top)
      this.cursorIsMoved = false
      this.shouldShowLabel = true
      this.canvasCursor = {
        xPx: xPx / this.canvas.scale,
        yPx: yPx / this.canvas.scale,
      }
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (!isClicking) {
        cm.resetDrawMaskPos()
      } else {
        // TODO: 呼び出すメソッドはCanvasに移譲したい
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
