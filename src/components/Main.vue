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
          <canvas-main></canvas-main>
          <canvas-footer :clearAxes="clearAxes"></canvas-footer>
        </v-col>
        <v-col class="pt-1" cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier-main></magnifier-main>
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
import { CanvasHeader, CanvasFooter, CanvasMain } from './Canvas'
import { AxesSettings, ExtractorSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { version } from '../../package.json'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'
import { axesMapper } from '@/store/modules/axes'
import { extractorMapper } from '@/store/modules/extractor'

export default Vue.extend({
  components: {
    MagnifierMain,
    CanvasHeader,
    CanvasMain,
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
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
  },
  async mounted() {
    document.addEventListener('paste', this.pasteHandler.bind(this))
    if (!this.initialGraphImagePath) {
      return
    }
    try {
      await this.canvas.initialize(this.initialGraphImagePath)
      this.drawFitSizeImage()
      this.setUploadImageUrl(this.initialGraphImagePath)

      // FIXME: setSwatchesはcolorSettingsのmountedに移す
      this.setSwatches(this.canvas.colorSwatches)
    } finally {
      //
    }
  },
  created() {},
  beforeDestroy() {
    document.removeEventListener('paste', this.pasteHandler)
  },
  methods: {
    ...datasetMapper.mapActions(['clearPlots']),
    ...canvasMapper.mapActions([
      'drawFitSizeImage',
      'setCanvasCursor',
      'setUploadImageUrl',
    ]),
    ...axesMapper.mapActions(['clearAxes']),
    ...extractorMapper.mapActions(['setSwatches']),
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
        this.setUploadImageUrl(fr.result)
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
  },
})
</script>
