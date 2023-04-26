<template>
  <v-container fluid>
    <v-row>
      <v-col class="pr-0 pt-1 pl-1" style="max-width: 240px">
        <image-settings></image-settings>
        <axes-settings></axes-settings>
        <dataset-manager
          :exportBtnText="exportBtnText"
          :exportBtnClick="exportBtnClick"
        ></dataset-manager>
        <data-table />
      </v-col>
      <v-col class="pt-1 pl-2 pr-0">
        <canvas-header></canvas-header>
        <canvas-main :imagePath="initialGraphImagePath"></canvas-main>
        <canvas-footer></canvas-footer>
      </v-col>
      <v-col class="pt-1 pr-1" style="max-width: 300px">
        <!-- TODO: 有効数字を追加する -->
        <magnifier-main></magnifier-main>
        <extractor-settings
          :initialExtractorStrategy="initialExtractorStrategy"
        ></extractor-settings>
        <p class="text-caption text-right">v{{ version }}</p>
      </v-col>
    </v-row>
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
  computed: {},
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
