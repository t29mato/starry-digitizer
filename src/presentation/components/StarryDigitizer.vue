<template>
  <v-container fluid class="pa-1">
    <div class="c__wrapper">
      <div class="c__left-sidebar">
        <div class="c__step">
          <h4 class="c__step-title">
            <span class="c__step-num">①</span> Image
          </h4>
          <image-settings></image-settings>
        </div>

        <div class="c__step">
          <h4 class="c__step-title"><span class="c__step-num">②</span> Axes</h4>
          <axis-set-manager></axis-set-manager>
          <axis-set-settings></axis-set-settings>
        </div>

        <div class="c__step">
          <h4 class="c__step-title">
            <span class="c__step-num">③</span> Extract
          </h4>
          <extractor-settings
            :initialExtractorStrategy="initialExtractorStrategy"
          ></extractor-settings>
        </div>

        <div class="c__step">
          <h4 class="c__step-title">
            <span class="c__step-num">④</span> Data &amp; Export
          </h4>
          <dataset-manager
            :exportBtnText="exportBtnText"
            :exportBtnClick="exportBtnClick"
          ></dataset-manager>
          <data-table />
        </div>
      </div>
      <div class="c__main-area">
        <canvas-header></canvas-header>
        <confirmer-bar></confirmer-bar>
        <canvas-main :imagePath="initialGraphImagePath"></canvas-main>
        <canvas-footer></canvas-footer>
      </div>
      <div class="c__right-sidebar">
        <magnifier-main></magnifier-main>
      </div>
    </div>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { MagnifierMain } from '@/presentation/components/Magnifier'
import { CanvasHeader, CanvasFooter, CanvasMain } from './Canvas'
import { AxisSetSettings, ExtractorSettings, ImageSettings } from './Settings'
import { DatasetManager } from './DatasetManager'
import { AxisSetManager } from './AxisSetManager'
import ConfirmerBar from '@/presentation/components/Generals/ConfirmerBar.vue'
import DataTable from '@/presentation/components/Export/DataTable.vue'

// INFO: docs/design/ui-refresh-implementation-notes.md (HQ Issue #56) —
// per owner feedback the left sidebar keeps its current placement (each
// step where Phase 1 of this refresh put it — ExtractorSettings stays here,
// moved from the right sidebar; ProjectManager stays in App.vue's app bar)
// but the collapsible accordion was dropped in favor of always-visible,
// non-interactive step numbers (①-④). No child component's props/behavior
// changed — only the static heading above each group.
export default defineComponent({
  components: {
    DataTable,
    MagnifierMain,
    CanvasHeader,
    CanvasMain,
    CanvasFooter,
    AxisSetManager,
    AxisSetSettings,
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
})
</script>

<style lang="scss" scoped>
$l_leftSidebarWidth: 280px;
$l_rightSidebarWidth: 260px;
$l_mainAreaSideMargin: 10px;

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

  &__step {
    margin-bottom: 16px;
  }

  &__step-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  &__step-num {
    color: #1e88e5;
  }
}
</style>
