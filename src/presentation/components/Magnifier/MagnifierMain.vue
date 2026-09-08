<template>
  <div ref="root" class="sd-panel c__magnifier mb-0">
    <!-- INFO: `sd-panel` is what makes this panel style itself, so a host
         composing the panels needs no `.starry-digitizer` wrapper around
         them; inside one it is a no-op. src/presentation/styles/base.scss. -->
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
      <!-- INFO: until the cursor has been over the graph once, the box has
           nothing to magnify: the crosshair sits on an empty area and reads as
           a broken image rather than as a viewer waiting for a cursor. Cover
           it with a plain hint instead. -->
      <div
        v-if="placeholderMessage"
        class="c__magnifier__placeholder"
        data-cy="magnifier-placeholder"
      >
        <strong>Magnifier</strong>
        <span>{{ placeholderMessage }}</span>
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
    const {
      magnifier,
      valueFormat,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    } = useDigitizerContext()
    return {
      magnifier,
      valueFormat,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
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
      // INFO: whether this magnifier has ever shown a magnified spot for the
      // image it currently holds. It is NOT the same as
      // `canvasHandler.isCursorOnCanvas`: once the user has magnified
      // something, leaving the image deliberately freezes the view at the
      // clamped edge (#255) and keeps following an off-image drag, so the hint
      // must not come back and blank it. Only the very first impression — the
      // state the user meets before touching anything — is replaced.
      hasMagnifiedOnce: false,
    }
  },
  watch: {
    'canvasHandler.isCursorOnCanvas'(isOnCanvas: boolean) {
      if (isOnCanvas) this.hasMagnifiedOnce = true
    },
    // INFO: a new image starts over: the frozen view belongs to the old one.
    'canvasHandler.uploadImageUrl'() {
      this.hasMagnifiedOnce = false
    },
  },
  computed: {
    // INFO: "no image at all" and "image loaded, cursor never on it" are
    // different situations and get different wording — telling someone to move
    // the cursor over a graph that is not there would be its own confusion.
    // Empty string means the real magnified view is shown.
    placeholderMessage(): string {
      if (!this.canvasHandler.hasImage) {
        return 'The magnified view appears here once an image is loaded.'
      }
      if (!this.hasMagnifiedOnce) {
        return 'Move the cursor over the graph to magnify it.'
      }
      return ''
    },
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
      // INFO: before the cursor has ever been over the graph, the read-out
      // would show the conversion of pixel (0, 0). On a calibrated figure that
      // is not an obviously-empty "0px" but a plausible measurement — the
      // embedding host measured `x: 1.286e+2, y: 3e-5` — and a reader takes it
      // for something the magnifier is currently pointing at. A dash cannot be
      // misread. Same condition as the placeholder above, so the two agree.
      if (!this.hasMagnifiedOnce) {
        return { xV: '—', yV: '—' }
      }
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
        this.valueFormat.effectiveDigits,
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
    // INFO: the box used to have no background of its own, so every part of
    // it the magnified image does not cover (three quarters of it before the
    // first hover, and a corner of it whenever the cursor is near an edge)
    // was transparent and showed the HOST page through. On a host that paints
    // a transparency checkerboard behind images, that read as "the image is
    // broken". Painting our own surface keeps the panel opaque wherever it is
    // embedded; a host restyles it through --sd-surface like everything else.
    background-color: var(--sd-surface, #ffffff);
  }

  // INFO: above every overlay in the box — points (1-2), the corner marks (3)
  // and the extract-size guides (5) — so none of them shows through the hint,
  // but below the settings button (100), which stays reachable.
  &__placeholder {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4em;
    // INFO: percentage padding follows the box, which the host resizes with
    // --sd-magnifier-size / the sidebar width, so the text keeps its margins
    // when the box is small instead of overflowing.
    padding: 6%;
    text-align: center;
    background-color: var(--sd-surface-variant, #f5f5f5);
    color: var(--sd-text-medium, rgba(0, 0, 0, 0.6));
    // INFO: the magnifier can be shrunk well below 300px; the text has to
    // shrink with it rather than spill out of the frame.
    font-size: 0.75em;
    line-height: 1.35;
    overflow: hidden;

    strong {
      font-size: 1.15em;
      color: var(--sd-text, rgba(0, 0, 0, 0.87));
    }
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
