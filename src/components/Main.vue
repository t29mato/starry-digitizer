<template>
  <v-container fluid>
    <template>
      <v-row>
        <v-col cols="2">
          <image-settings></image-settings>
          <axes-settings></axes-settings>
          <dataset-manager :exportBtnText="exportBtnText"></dataset-manager>
        </v-col>
        <v-col class="pt-1" cols="7">
          <canvas-header></canvas-header>
          <canvas-main></canvas-main>
          <canvas-footer></canvas-footer>
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
import { AxesSettings, ExtractorSettings, ImageSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { version } from '../../package.json'
import { canvasMapper } from '@/store/modules/canvas'
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
    ImageSettings,
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
    ...canvasMapper.mapGetters(['canvas']),
  },
  async mounted() {
    if (!this.initialGraphImagePath) {
      return
    }
    try {
      await this.canvas.initialize(this.initialGraphImagePath)
      this.drawFitSizeImage()
      this.setUploadImageUrl(this.initialGraphImagePath)
      this.setSwatches(this.canvas.colorSwatches)
    } finally {
      //
    }
  },
  created() {},
  methods: {
    ...canvasMapper.mapActions(['drawFitSizeImage', 'setUploadImageUrl']),
    ...extractorMapper.mapActions(['setSwatches']),
  },
})
</script>
