<template>
  <div ref="root" class="c__magnifier mb-0">
    <div ref="box" class="c__magnifier__box">
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

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'

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
  setup() {
    const { magnifier, canvasHandler, axisSetRepository, datasetRepository } =
      useDigitizerContext()
    return { magnifier, canvasHandler, axisSetRepository, datasetRepository }
  },

  // INFO: the magnifier box is square and its size drives canvas geometry and
  // the overlay math, so it cannot be a pure CSS value. Instead of a fixed
  // 300px it now follows the width its column actually gives it, which is what
  // lets a host narrow the sidebar (--sd-right-sidebar-*) without the
  // magnifier keeping the column wide. `--sd-magnifier-size` overrides it.
  mounted() {
    this.applySize()
    if (typeof ResizeObserver !== 'undefined' && this.$refs.box) {
      this.resizeObserver = new ResizeObserver(() => this.applySize())
      this.resizeObserver.observe(this.$refs.box as Element)
    }
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined
  },
  data() {
    return {
      resizeObserver: undefined as ResizeObserver | undefined,
      magnifierSettingError: '',
      shouldShowSettingsDialog: false,
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
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
        this.magnifier.effectiveDigits,
      )
      const values = calculator.calculateXYValues(
        this.canvasHandler.cursor.xPx,
        this.canvasHandler.cursor.yPx,
      )
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (values.xV === 'NaN' || values.yV === 'NaN') {
        return {
          xV: `${Math.max(Math.round(this.canvasHandler.cursor.xPx), 0)}px`,
          yV: `${Math.max(Math.round(this.canvasHandler.cursor.yPx), 0)}px`,
        }
      }
      return values
    },
  },
  methods: {
    // INFO: CSS owns the box size (--sd-magnifier-size, default
    // min(100%, 300px)); JS only mirrors the measured result into
    // magnifier.sizePx, which the canvas geometry and the overlay math need in
    // pixels. Measuring rather than computing means a host changing the
    // variable — or simply narrowing the column — is picked up by the
    // ResizeObserver with no extra API.
    applySize() {
      const box = this.$refs.box as HTMLElement | undefined
      if (!box) return
      const measured = Math.round(box.clientWidth)
      if (measured > 0 && measured !== this.magnifier.sizePx) {
        this.magnifier.setSizePx(measured)
      }
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
  // INFO: square box. `min(100%, 300px)` keeps the historical 300px on a wide
  // column but lets it shrink with --sd-right-sidebar-width instead of holding
  // the column open; a host can pin it with --sd-magnifier-size.
  &__box {
    width: var(--sd-magnifier-size, min(100%, 300px));
    aspect-ratio: 1 / 1;
    overflow: hidden;
    position: relative;
    outline: 1px solid grey;
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
@/domain/services/axisSetCalculator
