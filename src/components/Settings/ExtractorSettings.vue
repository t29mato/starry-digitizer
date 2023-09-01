<template>
  <div>
    <h4>Manual Extraction</h4>
    <v-btn-toggle
      :value="canvas.manualMode"
      @change="changeManualMode"
      dense
      class="pl-2"
    >
      <v-btn small color="primary"> Add (A) </v-btn>
      <v-btn small color="primary"> Edit (E) </v-btn>
      <v-btn small color="primary"> Delete (D) </v-btn>
    </v-btn-toggle>
    <h4>Automatic Extraction</h4>
    <v-select
      @input="setExtractStrategy"
      :value="extractor.strategy.name"
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
    <v-btn :loading="isExtracting" @click="extractPlots" color="primary" small
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
import { ExtractStrategy } from '@/domains/extractor'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/lineExtract'

import { useCanvasStore } from '@/store/canvas'
import { useExtractorStore } from '@/store/extractor'

const canvasStore = useCanvasStore()
const extractorStore = useExtractorStore()

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
    extractor: () => extractorStore.extractor,
    canvas: () => canvasStore.canvas,
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
    ...mapActions('extractor', ['setStrategy']),
    ...mapActions('axes', ['inactivateAxis']),
    ...mapActions('datasets', [
      'clearPlots',
      'setPlots',
      'sortPlots',
      'inactivatePlots',
    ]),
    ...mapActions('canvas', ['setManualMode']),
    changeManualMode(value: any) {
      this.inactivatePlots()
      if (value === undefined) {
        this.setManualMode(-1)
        return
      }
      this.setManualMode(value)
    },
    setExtractStrategy(strategy: ExtractStrategy) {
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
  },
})
</script>
