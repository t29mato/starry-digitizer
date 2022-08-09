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
            <canvas-plots></canvas-plots>
            <canvas-cursor></canvas-cursor>
          </div>
          <canvas-footer :clearAxes="clearAxes"></canvas-footer>
        </v-col>
        <v-col class="pt-1" cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier-main :uploadImageUrl="uploadImageUrl"></magnifier-main>
          <extractor-settings></extractor-settings>
          <p class="text-caption text-right">v{{ version }}</p>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { MagnifierMain } from '@/components/Magnifier'
import {
  CanvasHeader,
  CanvasFooter,
  CanvasAxes,
  CanvasPlots,
  CanvasCursor,
} from './Canvas'
import { AxesSettings, ExtractorSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { version } from '../../package.json'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'
import { axesMapper } from '@/store/modules/axes'
import { extractorMapper } from '@/store/modules/extractor'

// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

export default Vue.extend({
  components: {
    MagnifierMain,
    CanvasAxes,
    CanvasPlots,
    CanvasCursor,
    CanvasHeader,
    CanvasFooter,
    AxesSettings,
    DatasetManager,
    ExtractorSettings,
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
      version,
      uploadImageUrl: '',
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler.bind(this))
    document.addEventListener('paste', this.pasteHandler.bind(this))
    if (!this.initialGraphImagePath) {
      return
    }
    try {
      await this.canvas.initialize(
        'canvasWrapper',
        'imageCanvas',
        'maskCanvas',
        'tempMaskCanvas',
        'magnifierMaskCanvas',
        this.initialGraphImagePath
      )
      this.drawFitSizeImage()
      this.uploadImageUrl = this.initialGraphImagePath
      // FIXME: setSwatchesはcolorSettingsのmountedに移す
      this.setSwatches(this.canvas.colorSwatches)
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
    ...canvasMapper.mapActions([
      'drawFitSizeImage',
      'setCanvasCursor',
      'mouseMoveOnCanvas',
    ]),
    ...axesMapper.mapActions([
      'clearAxes',
      'addAxis',
      'moveActiveAxis',
      'inactivateAxis',
    ]),
    ...extractorMapper.mapActions(['setSwatches']),
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
      if (this.axes.isActive) {
        this.moveActiveAxis(key)
        this.setCanvasCursor(this.axes.activeAxis)
      }
      if (this.datasets.plotsAreActive) {
        this.moveActivePlot(e.key)
        this.setCanvasCursor(
          this.datasets.activeDataset.plots.filter((plot) =>
            this.datasets.activePlotIds.includes(plot.id)
          )[0]
        )
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
    async uploadImage(file: File) {
      try {
        const fr = await this.readFile(file)
        if (typeof fr.result !== 'string') {
          throw new Error('file is not string type')
        }
        // TODO: Canvasを利用する
        const image = await this.loadImage(fr.result)
        this.canvas.changeImage(image)
        this.drawFitSizeImage()
        this.setSwatches(this.canvas.colorSwatches)
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
      if (this.canvas.isDrawingMask) {
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
  },
})
</script>
