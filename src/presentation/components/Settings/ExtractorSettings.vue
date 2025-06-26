<template>
  <div>
    <h4>Manual Extraction</h4>
    <v-btn-toggle
      :model-value="canvasHandler.manualMode"
      @update:model-value="changeManualMode"
      density="compact"
      class="mb-2"
      divided
      :border="true"
    >
      <v-btn color="primary" size="small" class="pa-1"> Add (A) </v-btn>
      <v-btn color="primary" size="small" class="pa-1"> Edit (E) </v-btn>
      <v-btn color="primary" size="small" class="pa-1"> Delete (D) </v-btn>
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

    <div class="d-flex align-end mt-1 mb-2">
      <v-text-field
        id="interpolation-interval"
        class="mr-4"
        :model-value="interpolator.interval"
        @update:model-value="handleOnUpdateInterpolatorInterval"
        prefix="Interval: "
        suffix="px"
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
    <div class="d-flex align-center mb-1">
      <h4 class="mb-0">Automatic Extraction</h4>
      <v-btn
        :loading="isExtracting"
        @click="extractPoints"
        color="primary"
        size="small"
        class="ml-3"
        style="min-width: 60px"
        >Run</v-btn
      >
    </div>
    <v-select
      class="mb-2"
      @update:model-value="setExtractStrategy"
      :model-value="extractor.strategy.name"
      :items="extractor.strategies"
      density="compact"
      hide-details
      prefix="Algorithm: "
    ></v-select>
    <div v-if="extractor.strategy.name === 'Symbol Extract'">
      <symbol-extract-settings></symbol-extract-settings>
    </div>
    <div v-else-if="extractor.strategy.name === 'Line Extract'">
      <line-extract-settings></line-extract-settings>
    </div>
    <mask-settings></mask-settings>
    <color-settings></color-settings>
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

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { addLocalStorageData } from '@/application/utils/localStorageUtils'
import { confirmer } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

import { forceRenderCanvasPoints } from '@/presentation/hacks/forceRenderCanvasPoints'

export default defineComponent({
  components: {
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
  },
  data() {
    return {
      interpolator,
      confirmer,
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
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
      this.datasetRepository.activeDataset.inactivatePoints()
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
    //INFO: isActive: booleanであるが、@updateでtsエラーになるのでanyとしている
    handleOnClickInterpolatiorSwitch(isActive: any) {
      this.interpolator.setIsActive(isActive)

      if (isActive) {
        this.interpolator.updatePreview()
      } else {
        //NOTE: A temporary workaround to ensure that data points remain after turning off the interpolation function. A redesign is essential.
        const dataset = this.datasetRepository.activeDataset
        const addedPointIds: number[] = []
        dataset.points
          .filter((p) => dataset.manuallyAddedPointIds.includes(p.id))
          .forEach((p) => {
            dataset.addPoint(p.xPx, p.yPx)
            addedPointIds.push(dataset.lastPointId)
          })

        this.interpolator.clearPreview()

        //NOTE: A temporary workaround to ensure that data points remain after turning off the interpolation function. A redesign is essential.
        addedPointIds.forEach((pId) => {
          dataset.addManuallyAddedPointId(pId)
        })
      }

      //HACK: Since tempPoints are not drawn, force rendering as a temporary measure. Fundamental solution required
      forceRenderCanvasPoints(this.datasetRepository)

      addLocalStorageData('isInterpolatorActive', String(isActive))
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
    handleOnUpdateInterpolatorInterval(value: any) {
      this.interpolator.updateInterval(parseFloat(value))
      this.interpolator.updatePreview()

      //HACK: Since tempPoints are not drawn, force rendering as a temporary measure. Fundamental solution required
      forceRenderCanvasPoints(this.datasetRepository)
    },
  },
})
</script>
