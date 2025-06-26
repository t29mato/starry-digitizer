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
        :key="point.id"
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
    <span>x: {{ xyValue.xV }}, y: {{ xyValue.yV }}</span>
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
import AxisSetCalculator from '@/domain/services/axisSetCalculator'

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
      )
      return calculator.calculateXYValues(
        this.canvasHandler.cursor.xPx,
        this.canvasHandler.cursor.yPx,
      )
    },
  },
  methods: {
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
@/domain/services/axisSetCalculator
