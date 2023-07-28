<template>
  <v-container fluid>
    <div class="c__wrapper">
      <div class="c__left-sidebar">
        <image-settings></image-settings>
        <axes-settings></axes-settings>
        <dataset-manager
          :exportBtnText="exportBtnText"
          :exportBtnClick="exportBtnClick"
        ></dataset-manager>
        <data-table />
      </div>
      <div class="c__main-area">
        <canvas-header></canvas-header>
        <canvas-main :imagePath="initialGraphImagePath"></canvas-main>
        <canvas-footer></canvas-footer>
      </div>
      <div class="c__right-sidebar">
        <!-- TODO: 有効数字を追加する -->
        <magnifier-main></magnifier-main>
        <extractor-settings
          :initialExtractorStrategy="initialExtractorStrategy"
        ></extractor-settings>
        <p class="text-caption text-right">v{{ version }}</p>
        <p v-if="isDev" class="text-caption text-right">
          {{ githubRunNumber }}
        </p>
      </div>
    </div>
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
import DataTable from '@/components/Export/DataTable.vue'

export default Vue.extend({
  store,
  components: {
    DataTable,
    MagnifierMain,
    CanvasHeader,
    CanvasMain,
    CanvasFooter,
    AxesSettings,
    DatasetManager,
    ExtractorSettings,
    ImageSettings,
  },
  computed: {
    isDev() {
      return process.env.NODE_ENV === 'development'
    },
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
      githubRunNumber: process.env.VUE_APP_GITHUB_RUN_NUMBER,
    }
  },
})
</script>
