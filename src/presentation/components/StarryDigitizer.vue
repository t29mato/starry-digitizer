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
        <confirmer-bar></confirmer-bar>
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
          {{ appVerAndBuildInfo }}
        </p>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { MagnifierMain } from '@/presentation/components/Magnifier'
import { CanvasHeader, CanvasFooter, CanvasMain } from './Canvas'
import { AxesSettings, ExtractorSettings, ImageSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { version } from '../../../package.json'
import ConfirmerBar from '@/presentation/components/Generals/ConfirmerBar.vue'
import DataTable from '@/presentation/components/Export/DataTable.vue'

export default defineComponent({
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
    ConfirmerBar,
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
  computed: {
    appVerAndBuildInfo() {
      const appVer: string = this.isProd ? `v${this.version}` : ''
      const buildNumber: string = this.githubRunNumber
        ? `#${this.githubRunNumber}`
        : ''

      return appVer + buildNumber
    },
  },
  data() {
    return {
      version,
      githubRunNumber: import.meta.env.VITE_APP_GITHUB_RUN_NUMBER,
      isProd: import.meta.env.MODE === 'production',
    }
  },
})
</script>

<style lang="scss" scopde>
$l_leftSidebarWidth: 260px;
$l_rightSidebarWidth: 300px;
$l_mainAreaSideMargin: 20px;

.c {
  &__wrapper {
    display: flex;
  }

  &__left-sidebar {
    width: $l_leftSidebarWidth;
  }

  &__right-sidebar {
    width: $l_rightSidebarWidth;
  }

  &__main-area {
    margin: 0 $l_mainAreaSideMargin;
    width: calc(
      100% -
        (
          #{$l_leftSidebarWidth} + #{$l_rightSidebarWidth} +
            (#{$l_mainAreaSideMargin * 2})
        )
    );
  }
}
</style>
