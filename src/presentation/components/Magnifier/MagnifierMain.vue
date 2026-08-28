<template>
  <div class="c__magnifier mb-0">
    <div
      :style="{
        overflow: 'hidden',
        width: `${magnifier.sizePx}px`,
        height: `${magnifier.sizePx}px`,
        position: 'relative',
        outline: '1px solid grey',
      }"
    >
      <magnifier-settings-btn
        :toggleSettingsDialog="toggleSettingsDialog"
      ></magnifier-settings-btn>
      <magnifier-image></magnifier-image>
      <!-- Show all datasets mode -->
      <template v-if="datasetRepository.isViewAllMode">
        <template v-for="dataset in datasetRepository.datasets">
          <div
            v-for="point in dataset.points"
            :key="`${dataset.id}-${point.id}`"
          >
            <magnifier-points
              :point="point"
              :magnifierSize="magnifier.sizePx"
              :isActive="
                dataset.id === datasetRepository.activeDatasetId &&
                dataset.activePointIds.includes(point.id)
              "
              :isVisible="dataset.visiblePointIds.includes(point.id)"
              :isManuallyAdded="
                dataset.manuallyAddedPointIds.includes(point.id)
              "
              :datasetColor="datasetRepository.getDatasetColor(dataset.id)"
            ></magnifier-points>
          </div>
        </template>
        <!-- Show temp points only for active dataset -->
        <div
          v-for="point in datasetRepository.activeDataset.tempPoints"
          :key="`temp-${point.id}`"
        >
          <magnifier-points
            :point="point"
            :magnifierSize="magnifier.sizePx"
            :isActive="false"
            :isVisible="true"
            :isTemporary="true"
            :isManuallyAdded="false"
          ></magnifier-points>
        </div>
      </template>
      <!-- Show active dataset only mode (default) -->
      <template v-else>
        <div
          v-for="point in datasetRepository.activeDataset.points"
          :key="point.id"
        >
          <magnifier-points
            :point="point"
            :magnifierSize="magnifier.sizePx"
            :isActive="
              datasetRepository.activeDataset.activePointIds.includes(point.id)
            "
            :isVisible="
              datasetRepository.activeDataset.visiblePointIds.includes(point.id)
            "
            :isManuallyAdded="
              datasetRepository.activeDataset.manuallyAddedPointIds.includes(
                point.id,
              )
            "
          ></magnifier-points>
        </div>
        <div
          v-for="point in datasetRepository.activeDataset.tempPoints"
          :key="`temp-${point.id}`"
        >
          <magnifier-points
            :point="point"
            :magnifierSize="magnifier.sizePx"
            :isActive="
              datasetRepository.activeDataset.activePointIds.includes(point.id)
            "
            :isVisible="true"
            :isTemporary="true"
            :isManuallyAdded="false"
          ></magnifier-points>
        </div>
      </template>
      <magnifier-extract-size></magnifier-extract-size>
      <magnifier-axis-set></magnifier-axis-set>
      <magnifier-vertical-line></magnifier-vertical-line>
      <magnifier-horizontal-line></magnifier-horizontal-line>
      <div class="c__magnifier__white-outlines">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
    <div class="c__magnifier__readout">
      <span>x: {{ displayValue(xyValue.xV) }}</span>
      <span>y: {{ displayValue(xyValue.yV) }}</span>
    </div>
    <magnifier-settings
      :shouldShowSettingsDialog="shouldShowSettingsDialog"
      :toggleSettingsDialog="toggleSettingsDialog"
      :magnifierSettingError="magnifierSettingError"
      :setMagnifierScale="setMagnifierScale"
    ></magnifier-settings>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxisSet from './MagnifierAxisSet.vue'
import MagnifierPoints from './MagnifierPoints.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import MagnifierExtractSize from '@/presentation/components/Magnifier/MagnifierExtractSize.vue'
import { AxisSetCalculator } from '@plot-digitizer/core'

import { magnifier } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxisSet,
    MagnifierPoints,
    MagnifierSettings,
    MagnifierSettingsBtn,
    MagnifierExtractSize,
  },
  data() {
    return {
      magnifierSettingError: '',
      shouldShowSettingsDialog: false,
      magnifier,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  computed: {
    // magnifierHalfSize(): number {
    //   return this.magnifier.sizePx / 2
    // },
    // INFO: 小数点ありのピクセル表示するとユーザーを混乱させるので表示上は切り上げ
    // canvasCursorCeil(): {
    //   xPx: number
    //   yPx: number
    // } {
    //   return {
    //     xPx: Math.ceil(this.canvasCursor.xPx),
    //     yPx: Math.ceil(this.canvasCursor.yPx),
    //   }
    // },
    xyValue(): {
      xV: string
      yV: string
    } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
        this.magnifier.effectiveDigits,
      )
      return calculator.calculateXYValues(
        this.canvasHandler.cursor.xPx,
        this.canvasHandler.cursor.yPx,
      )
    },
  },
  methods: {
    // INFO: docs/design/ui-refresh-implementation-notes.md — display-only
    // formatting. AxisSetCalculator's calculation itself (xyValue) is
    // untouched; this just decides how to print a non-finite result.
    displayValue(value: string): string {
      return /^-?Infinity$|^NaN$/.test(value) ? '—' : value
    },
    toggleSettingsDialog(): void {
      this.shouldShowSettingsDialog = !this.shouldShowSettingsDialog
    },
    setMagnifierScale(value: string): void {
      const scale = parseInt(value)
      this.magnifierSettingError = ''
      if (scale < 2) {
        this.magnifierSettingError =
          'The Magnifier scale is supposed to be larger than 2 times.'
        this.magnifier.setScale(2)
        return
      }
      this.magnifier.setScale(parseInt(value))
    },
  },
})
</script>

<style scoped lang="scss">
$_white-outline-size: 24px;
$_white-outline-pos-value: calc(50% - #{$_white-outline-size} - 1px);
.c__magnifier {
  &__readout {
    display: flex;
    gap: 12px;
    margin-top: 4px;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  &__white-outlines {
    pointer-events: none;

    & > div {
      position: absolute;
      width: $_white-outline-size;
      height: $_white-outline-size;
      border-color: white;
      border-style: solid;
      border-width: 0;
      z-index: 3;

      &:nth-child(1) {
        top: $_white-outline-pos-value;
        left: $_white-outline-pos-value;
        border-width: 0 1px 1px 0;
      }

      &:nth-child(2) {
        top: $_white-outline-pos-value;
        right: $_white-outline-pos-value;
        border-width: 0 0 1px 1px;
      }

      &:nth-child(3) {
        bottom: $_white-outline-pos-value;
        left: $_white-outline-pos-value;
        border-width: 1px 1px 0 0;
      }

      &:nth-child(4) {
        bottom: $_white-outline-pos-value;
        right: $_white-outline-pos-value;
        border-width: 1px 0 0 1px;
      }
    }
  }
}
</style>
