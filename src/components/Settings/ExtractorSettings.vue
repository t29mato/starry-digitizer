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
    <v-btn class="mt-1 mb-4" @click="interpolateCurve" size="small"
      >Interpolate a curve</v-btn
    >

    <h4 class="mb-2">Automatic Extraction</h4>
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
    <v-btn
      :loading="isExtracting"
      @click="extractPlots"
      color="primary"
      size="small"
      >Run</v-btn
    >
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

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

import { CurveInterpolator } from 'curve-interpolator'

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
    interpolateCurve() {
      //TODO move to domain
      const points = this.datasets.activeDataset.plots.map((plot) => [
        plot.xPx,
        plot.yPx,
      ])

      const interp = new CurveInterpolator(points, { tension: 0.2, alpha: 0.5 })

      const segments = 100
      const interpolatedPoints = interp.getPoints(segments)

      this.datasets.activeDataset.clearPlots()

      interpolatedPoints.forEach((point: number[]) => {
        this.datasets.activeDataset.addPlot(point[0], point[1])
      })
    },
  },
})
</script>
