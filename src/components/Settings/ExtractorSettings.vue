<template>
  <div>
    <h4 class="mb-2">Manual Extraction</h4>
    <v-btn-toggle
      :model-value="canvas.manualMode"
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
    <h5 class="mt-2">Interpolation</h5>
    <div class="d-flex align-end mt-1 mb-4">
      <v-text-field
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
      ></v-text-field>
      <v-btn
        @click="handleOnClickInterpolate"
        size="small"
        color="primary"
        :disabled="datasets.activeDataset.manuallyAddedPlotIds.length === 0"
        >Interpolate</v-btn
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
import { Coord } from '@/domains/datasetInterface'

import SymbolExtractSettings from './SymbolExtractSettings.vue'
import LineExtractSettings from './LineExtractSettings.vue'
import MaskSettings from './MaskSettings.vue'
import ColorSettings from './ColorSettings.vue'
// import { ExtractStrategy } from '@/domains/extractor'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/lineExtract'

import { useCanvasStore } from '@/store/canvas'
import { useExtractorStore } from '@/store/extractor'
import { useDatasetsStore } from '@/store/datasets'
import { useAxesStore } from '@/store/axes'
import { mapState, mapActions } from 'pinia'
import { useInterpolatorStore } from '@/store/interpolator'

export default defineComponent({
  components: {
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
  },
  data() {
    return {
      isExtracting: false,
    }
  },
  computed: {
    ...mapState(useExtractorStore, ['extractor']),
    ...mapState(useCanvasStore, ['canvas']),
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useAxesStore, ['axes']),
    ...mapState(useInterpolatorStore, ['interpolator']),
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
        this.setStrategy(SymbolExtractByArea.instance)
        break
      case 'Line Extract':
        this.setStrategy(LineExtract.instance)
    }
  },
  methods: {
    ...mapActions(useExtractorStore, ['setStrategy']),
    ...mapActions(useAxesStore, ['inactivateAxis']),
    ...mapActions(useDatasetsStore, [
      'clearPlots',
      'setPlots',
      'sortPlots',
      'inactivatePlots',
    ]),
    ...mapActions(useCanvasStore, ['setManualMode']),
    changeManualMode(value: any) {
      this.inactivatePlots()
      if (value === undefined) {
        this.setManualMode(-1)
        return
      }
      this.setManualMode(value)
    },
    setExtractStrategy(strategy: any) {
      switch (strategy) {
        case 'Symbol Extract':
          this.setStrategy(SymbolExtractByArea.instance)
          break
        case 'Line Extract':
          this.setStrategy(LineExtract.instance)
      }
    },
    async extractPlots() {
      this.isExtracting = true
      this.inactivateAxis()
      this.clearPlots()
      try {
        this.setPlots(this.extractor.execute(this.canvas))
        this.sortPlots()
      } catch (e) {
        console.error('failed to extractPlots', { cause: e })
      } finally {
        this.isExtracting = false
      }
    },
    handleOnClickInterpolate() {
      //TODO : move to usecase layer
      const dataset = this.datasets.activeDataset

      dataset.manuallyAddedPlotIds.forEach((plotId) => {
        dataset.removeVisiblePlotId(plotId)
      })

      this.interpolator.interpolatedCoords.forEach((coord: Coord) => {
        dataset.addTempPlot(coord.xPx, coord.yPx)
      })

      //TODO: Is there any way to get when plots are drawn
      setTimeout(() => {
        if (window.confirm('Do you want to apply this interpolation result?')) {
          this.canvas.clearInterpolationGuideCanvas()

          dataset.manuallyAddedPlotIds.forEach((plotId) => {
            dataset.clearPlot(plotId)
          })
          dataset.tempPlots.forEach((tempPlot) => {
            dataset.moveTempPlotToPlot(tempPlot.id)
          })
        } else {
          dataset.manuallyAddedPlotIds.forEach((plotId) => {
            dataset.addVisiblePlotId(plotId)
          })
          dataset.tempPlots.forEach((tempPlot) => {
            dataset.clearTempPlot(tempPlot.id)
          })
        }
      }, 300)
    },
    handleOnUpdateInterpolatorInterval(value: any) {
      const plots = this.datasets.activeDataset.plots
      this.interpolator.updateInterval(parseFloat(value))

      if (plots.length > 1) {
        this.interpolator.setSplineInterpolatedCoords(plots)
        this.canvas.drawInterpolationGuideLine(
          this.interpolator.interpolatedCoords,
        )
      }
    },
  },
})
</script>
