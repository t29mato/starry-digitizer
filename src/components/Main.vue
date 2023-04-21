<template>
  <v-container fluid>
    <template>
      <v-row>
        <v-col cols="2" class="pr-0">
          <image-settings></image-settings>
          <axes-settings></axes-settings>
          <dataset-manager
            :exportBtnText="exportBtnText"
            :exportBtnClick="exportBtnClick"
          ></dataset-manager>
        </v-col>
        <v-col class="pt-1" cols="7">
          <canvas-header></canvas-header>
          <canvas-main :imagePath="initialGraphImagePath"></canvas-main>
          <canvas-footer></canvas-footer>
        </v-col>
        <v-col class="pt-1" cols="3">
          <!-- TODO: 有効数字を追加する -->
          <magnifier-main></magnifier-main>
          <extractor-settings
            :initialExtractorStrategy="initialExtractorStrategy"
          ></extractor-settings>
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
import store from '@/store'

export default Vue.extend({
  store,
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
    initialExtractorStrategy: {
      type: String,
      required: false,
    },
    exportBtnText: String,
    exportBtnClick: {
      type: Function,
      required: false,
    },
  },
  data() {
    return {
      version,
    }
  },
})
</script>
