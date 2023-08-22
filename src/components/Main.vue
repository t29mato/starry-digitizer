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
        <p class="text-caption text-right">
          <!-- INFO: vバージョン#actionsのビルド番号 -->
          v{{ version }}#{{ githubRunNumber }}
        </p>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts">
import { ref } from 'vue'
import { MagnifierMain } from '@/components/Magnifier'
import { CanvasHeader, CanvasFooter, CanvasMain } from './Canvas'
import { AxesSettings, ExtractorSettings, ImageSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { version as appVersion } from '../../package.json' // Renamed version to appVersion
import DataTable from '@/components/Export/DataTable.vue'

export default {
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
  props: {
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
  setup() {
    const version = ref(appVersion) // Changed version to appVersion
    const githubRunNumber = ref(process.env.VUE_APP_GITHUB_RUN_NUMBER)

    return {
      version,
      githubRunNumber,
    }
  },
}
</script>
