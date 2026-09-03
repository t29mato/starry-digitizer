<template>
  <div>
    <h4>Manual Extraction</h4>
    <div
      v-if="datasetRepository.isViewAllMode"
      class="text-caption mb-2"
      style="color: #999"
    >
      Disabled in View All mode
    </div>
    <!-- INFO: replacement for <v-btn-toggle>: clicking the active mode
         deselects it (MANUAL_MODE.UNSET), same as Vuetify's toggle. -->
    <div v-else class="c__manual-modes mb-2" role="group">
      <sd-button
        v-for="mode in manualModes"
        :key="mode.label"
        size="small"
        class="pa-1"
        :color="canvasHandler.manualMode === mode.value ? 'primary' : ''"
        :variant="
          canvasHandler.manualMode === mode.value ? 'elevated' : 'outlined'
        "
        :disabled="options.readonly"
        :data-cy="mode.dataCy"
        @click="changeManualMode(mode.value)"
      >
        {{ mode.label }}
      </sd-button>
    </div>
    <div class="d-flex align-center">
      <h5>Interpolation</h5>
      <sd-checkbox
        id="switch-interpolation"
        class="ml-3"
        :model-value="interpolator.isActive"
        @update:model-value="handleOnClickInterpolatiorSwitch"
        :disabled="options.readonly || datasetRepository.isViewAllMode"
      ></sd-checkbox>
    </div>

    <div v-if="interpolator.isActive" class="d-flex align-end mt-1 mb-2">
      <sd-text-field
        id="interpolation-interval"
        class="mr-4"
        :model-value="interpolator.interval"
        @update:model-value="handleOnUpdateInterpolatorInterval"
        label="Interval (px)"
        type="number"
        min="2"
        step="1"
        max="30"
        :disabled="options.readonly"
      ></sd-text-field>
      <sd-button
        id="confirm-interpolation"
        @click="handleOnConfirmInterpolation"
        size="small"
        color="primary"
        :disabled="options.readonly"
        >Confirm</sd-button
      >
    </div>
    <div class="d-flex align-center mb-1">
      <h4 class="mb-0">Automatic Extraction</h4>
      <sd-button
        @click="extractPoints"
        color="primary"
        size="small"
        class="ml-3"
        style="min-width: 60px"
        :disabled="
          options.readonly || datasetRepository.isViewAllMode || isExtracting
        "
        >{{ isExtracting ? 'Run…' : 'Run' }}</sd-button
      >
    </div>
    <sd-select
      class="mb-2"
      data-cy="extract-strategy"
      @update:model-value="setExtractStrategy"
      :model-value="extractor.strategy.name"
      :items="extractor.strategies"
      label="Algorithm"
      :disabled="options.readonly || datasetRepository.isViewAllMode"
    ></sd-select>
    <div v-if="!datasetRepository.isViewAllMode">
      <div v-if="extractor.strategy.name === 'Symbol Extract'">
        <symbol-extract-settings></symbol-extract-settings>
      </div>
      <div v-else-if="extractor.strategy.name === 'Line Extract'">
        <line-extract-settings></line-extract-settings>
      </div>
      <mask-settings></mask-settings>
      <color-settings></color-settings>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import SymbolExtractSettings from './SymbolExtractSettings.vue'
import LineExtractSettings from './LineExtractSettings.vue'
import MaskSettings from './MaskSettings.vue'
import ColorSettings from './ColorSettings.vue'
// import { ExtractStrategy } from '@/application/strategies/extractor'
import SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'
import LineExtract from '@/application/strategies/extractStrategies/lineExtract'

import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdButton, SdCheckbox, SdSelect, SdTextField } from '@/presentation/ui'
import { MANUAL_MODE } from '@/constants'

import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'
import { toggleInterpolation } from '@/application/utils/interpolationToggle'

export default defineComponent({
  components: {
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
    SdButton,
    SdCheckbox,
    SdSelect,
    SdTextField,
  },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const {
      interpolator,
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    } = ctx
    return {
      ctx,
      options,
      interpolator,
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  data() {
    return {
      isExtracting: false,
      manualModes: [
        { label: 'Add (A)', value: MANUAL_MODE.ADD, dataCy: 'manual-add' },
        { label: 'Edit (E)', value: MANUAL_MODE.EDIT, dataCy: 'manual-edit' },
        {
          label: 'Delete (D)',
          value: MANUAL_MODE.DELETE,
          dataCy: 'manual-delete',
        },
      ],
    }
  },
  props: {
    // INFO: <StarryDigitizer> no longer passes this down; kept optional so
    // any remaining direct user of the component behaves as before.
    initialExtractorStrategy: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  mounted() {
    switch (this.initialExtractorStrategy) {
      case 'Symbol Extract':
        this.extractor.setStrategy(SymbolExtractByArea.instance)
        break
      case 'Line Extract':
        this.extractor.setStrategy(LineExtract.instance)
    }
  },
  methods: {
    changeManualMode(value: number) {
      this.datasetRepository.activeDataset.inactivatePoints()
      if (this.canvasHandler.manualMode === value) {
        this.canvasHandler.setManualMode(MANUAL_MODE.UNSET)
        return
      }
      this.canvasHandler.setManualMode(value)
    },
    setExtractStrategy(strategy: string | number) {
      switch (strategy) {
        case 'Symbol Extract':
          this.extractor.setStrategy(SymbolExtractByArea.instance)
          break
        case 'Line Extract':
          this.extractor.setStrategy(LineExtract.instance)
      }
    },
    async extractPoints() {
      this.isExtracting = true
      this.axisSetRepository.activeAxisSet.inactivateAxis()
      try {
        this.datasetRepository.setPoints(
          this.extractor.execute(this.canvasHandler),
        )
        this.datasetRepository.sortPoints()
      } catch (e) {
        console.error('failed to extractPoints', { cause: e })
      } finally {
        this.isExtracting = false
      }
    },
    handleOnClickInterpolatiorSwitch(isActive: boolean | string | number) {
      toggleInterpolation(this.ctx, Boolean(isActive))
    },
    handleOnConfirmInterpolation() {
      if (
        this.datasetRepository.activeDataset.manuallyAddedPointIds.length < 2
      ) {
        alert(
          'Point 2 or more points by clicking the graph image to execute interpolation.',
        )
        return
      }
      const activeDataset = this.datasetRepository.activeDataset

      activeDataset.tempPoints.forEach((tempPoint) => {
        activeDataset.moveTempPointToPoint(tempPoint.id)
      })
      activeDataset.manuallyAddedPointIds.forEach((pointId) => {
        activeDataset.clearPoint(pointId)
      })

      this.datasetRepository.activeDataset.switchActivatedPoint(
        activeDataset.lastPointId,
      )

      this.interpolator.clearPreview()
    },
    handleOnUpdateInterpolatorInterval(value: string | number) {
      const parsed = parseFloat(String(value))
      if (isNaN(parsed)) {
        return
      }
      this.interpolator.updateInterval(parsed)
      this.interpolator.updatePreview()

      //HACK: Since tempPoints are not drawn, force rendering as a temporary measure. Fundamental solution required
      forceRenderCanvasPoints(this.datasetRepository)
    },
  },
})
</script>

<style lang="scss" scoped>
.c__manual-modes {
  display: inline-flex;

  :deep(.sd-btn) {
    border-radius: 0;
    &:first-child {
      border-top-left-radius: var(--sd-radius, 4px);
      border-bottom-left-radius: var(--sd-radius, 4px);
    }
    &:last-child {
      border-top-right-radius: var(--sd-radius, 4px);
      border-bottom-right-radius: var(--sd-radius, 4px);
    }
    & + .sd-btn {
      margin-left: -1px;
    }
  }
}
</style>
