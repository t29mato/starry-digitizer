<template>
  <v-container fluid class="pa-1">
    <div class="c__wrapper">
      <div class="c__left-sidebar">
        <v-expansion-panels v-model="openStep" variant="accordion">
          <v-expansion-panel value="image">
            <v-expansion-panel-title>
              <span class="c__step-title"
                ><span
                  class="c__step-check"
                  :class="{ 'c__step-check--done': imageStepDone }"
                  >{{ imageStepDone ? '✓' : '①' }}</span
                >
                Image</span
              >
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <image-settings></image-settings>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="axes">
            <v-expansion-panel-title>
              <span class="c__step-title"
                ><span
                  class="c__step-check"
                  :class="{ 'c__step-check--done': axesStepDone }"
                  >{{ axesStepDone ? '✓' : '②' }}</span
                >
                Axes</span
              >
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <axis-set-manager></axis-set-manager>
              <axis-set-settings></axis-set-settings>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="extract">
            <v-expansion-panel-title>
              <span class="c__step-title"
                ><span
                  class="c__step-check"
                  :class="{ 'c__step-check--done': extractStepDone }"
                  >{{ extractStepDone ? '✓' : '③' }}</span
                >
                Extract</span
              >
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <extractor-settings
                :initialExtractorStrategy="initialExtractorStrategy"
              ></extractor-settings>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel value="data">
            <v-expansion-panel-title>
              <span class="c__step-title"
                ><span
                  class="c__step-check"
                  :class="{ 'c__step-check--done': dataStepDone }"
                  >{{ dataStepDone ? '✓' : '④' }}</span
                >
                Data &amp; Export</span
              >
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <dataset-manager
                :exportBtnText="exportBtnText"
                :exportBtnClick="exportBtnClick"
              ></dataset-manager>
              <data-table />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
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
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'

// INFO: docs/design/ui-refresh-implementation-notes.md (HQ Issue #56) —
// left sidebar reorganized as a numbered-step accordion. Every child
// component below keeps its existing props/behavior; only where it's
// mounted in the template changed (ExtractorSettings moved here from the
// right sidebar). ProjectManager moved out to App.vue's new app bar.
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
  data() {
    return {
      canvasHandler,
      axisSetRepository,
      datasetRepository,
      // INFO: which accordion panel(s) are expanded. Keeping all four open
      // by default preserves today's "everything visible at once" behavior
      // (and every existing E2E interaction path) — the accordion mainly
      // adds the step grouping/labels/checkmarks, it doesn't hide anything
      // the user hasn't collapsed themselves.
      openStep: ['image', 'axes', 'extract', 'data'],
    }
  },
  computed: {
    // INFO: purely presentational — read-only checks against existing
    // repository/domain getters, no new state or mutations.
    imageStepDone(): boolean {
      return Boolean(this.canvasHandler.uploadImageUrl)
    },
    axesStepDone(): boolean {
      return !this.axisSetRepository.activeAxisSet.nextAxis
    },
    extractStepDone(): boolean {
      return this.datasetRepository.datasets.some(
        (dataset) => dataset.points.length > 0,
      )
    },
    dataStepDone(): boolean {
      return this.extractStepDone
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

  &__step-title {
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
  }

  &__step-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 8px;
    border-radius: 50%;
    font-size: 11px;
    color: #616161;
    background: #eeeeee;

    &--done {
      color: #fff;
      background: #1e88e5;
    }
  }
}
</style>
