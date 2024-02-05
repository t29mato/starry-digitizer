<template>
  <div>
    <h4 class="mb-2">Manual Extraction</h4>
    <v-btn-toggle
      :model-value="canvasHandler.manualMode"
      @update:model-value="changeManualMode"
      density="compact"
      class="mb-2"
      divided
      :border="true"
    >
      <v-btn size="small" color="primary"> Add (A) </v-btn>
      <v-btn size="small" color="primary"> Edit (E) </v-btn>
      <v-btn size="small" color="primary"> Delete (D) </v-btn>
    </v-btn-toggle>
    <div class="d-flex align-center">
      <h5>Interpolation</h5>
      <v-switch
        id="switch-interpolation"
        class="ml-3"
        color="primary"
        :model-value="interpolator.isActive"
        @update:model-value="handleOnClickInterpolatiorSwitch"
        hide-details
        density="compact"
      ></v-switch>
    </div>

    <div class="d-flex align-end mt-1 mb-4">
      <v-text-field
        id="interpolation-interval"
        class="mr-4"
        :model-value="interpolator.interval"
        @update:model-value="handleOnUpdateInterpolatorInterval"
        label="Interval"
        type="number"
        min="2"
        step="1"
        max="30"
        density="compact"
        hide-details
        :disabled="!interpolator.isActive"
      ></v-text-field>
      <v-btn
        id="confirm-interpolation"
        @click="handleOnConfirmInterpolation"
        size="small"
        color="primary"
        :disabled="!interpolator.isActive"
        >Confirm</v-btn
      >
    </div>
    <v-divider></v-divider>
    <h4 class="mt-4 mb-2">Automatic Extraction</h4>
    <v-select
      @update:model-value="setExtractStrategy"
      :model-value="extractor.strategy.name"
      :items="extractor.strategies"
      label="Select Algorithm"
    ></v-select>
    <div v-if="extractor.strategy.name === 'Symbol Extract'">
      <symbol-extract-settings></symbol-extract-settings>
    </div>
    <div v-else-if="extractor.strategy.name === 'Line Extract'">
      <line-extract-settings></line-extract-settings>
    </div>
    <mask-settings></mask-settings>
    <color-settings></color-settings>
    <div class="text-right mb-4">
      <v-btn
        :loading="isExtracting"
        @click="extractPlots"
        color="primary"
        size="small"
        >Run</v-btn
      >
    </div>
    <v-divider></v-divider>
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

import { Interpolator } from '@/application/services/interpolator/interpolator'
import { addLocalStorageData } from '@/application/utils/localStorageUtils'
import { Confirmer } from '@/application/services/confirmer/confirmer'
import { Extractor } from '@/application/services/extractor/extractor'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'
import { DatasetRepositoryManager } from '@/domain/repositories/datasetRepository/manager/datasetRepositoryManager'

import { forceRenderCanvasPlots } from '@/presentation/hacks/forceRenderCanvasPlots'

export default defineComponent({
  components: {
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
  },
  data() {
    return {
      interpolator: Interpolator.getInstance(),
      confirmer: Confirmer.getInstance(),
      extractor: Extractor.getInstance(),
      canvasHandler: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
      datasets: DatasetRepositoryManager.getInstance(),
      isExtracting: false,
    }
  },
  props: {
    initialExtractorStrategy: {
      type: String,
      required: false,
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
    changeManualMode(value: any) {
      this.datasets.activeDataset.inactivatePlots()
      if (value === undefined) {
        this.canvasHandler.setManualMode(-1)
        return
      }
      this.canvasHandler.setManualMode(value)
    },
    setExtractStrategy(strategy: any) {
      switch (strategy) {
        case 'Symbol Extract':
          this.extractor.setStrategy(SymbolExtractByArea.instance)
          break
        case 'Line Extract':
          this.extractor.setStrategy(LineExtract.instance)
      }
    },
    async extractPlots() {
      this.isExtracting = true
      this.axes.inactivateAxis()
      try {
        this.datasets.setPlots(this.extractor.execute(this.canvasHandler))
        this.datasets.sortPlots()
      } catch (e) {
        console.error('failed to extractPlots', { cause: e })
      } finally {
        this.isExtracting = false
      }
    },
    //INFO: isActive: booleanであるが、@updateでtsエラーになるのでanyとしている
    handleOnClickInterpolatiorSwitch(isActive: any) {
      this.interpolator.setIsActive(isActive)

      if (isActive) {
        this.interpolator.updatePreview()
      } else {
        this.interpolator.clearPreview()
      }

      //HACK: Since tempPlots are not drawn, force rendering as a temporary measure. Fundamental solution required
      forceRenderCanvasPlots(this.datasets)

      addLocalStorageData('isInterpolatorActive', String(isActive))
    },
    handleOnConfirmInterpolation() {
      if (this.datasets.activeDataset.manuallyAddedPlotIds.length < 2) {
        alert(
          'Plot 2 or more points by clicking the graph image to execute interpolation.',
        )
        return
      }
      const activeDataset = this.datasets.activeDataset

      activeDataset.tempPlots.forEach((tempPlot) => {
        activeDataset.moveTempPlotToPlot(tempPlot.id)
      })
      activeDataset.manuallyAddedPlotIds.forEach((plotId) => {
        activeDataset.clearPlot(plotId)
      })

      this.datasets.activeDataset.switchActivatedPlot(activeDataset.lastPlotId)

      this.interpolator.clearPreview()
    },
    handleOnUpdateInterpolatorInterval(value: any) {
      this.interpolator.updateInterval(parseFloat(value))
      this.interpolator.updatePreview()

      //HACK: Since tempPlots are not drawn, force rendering as a temporary measure. Fundamental solution required
      forceRenderCanvasPlots(this.datasets)
    },
  },
})
</script>
