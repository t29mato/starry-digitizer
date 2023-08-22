<template>
  <div>
    <h4>Manual Extraction</h4>
    <v-btn-toggle
      :model-value="canvas.manualMode"
      @update:model-value="changeManualMode"
      density="compact"
      class="pl-2"
    >
      <v-btn size="small" color="primary"> Add (A) </v-btn>
      <v-btn size="small" color="primary"> Edit (E) </v-btn>
      <v-btn size="small" color="primary"> Delete (D) </v-btn>
    </v-btn-toggle>
    <h4>Automatic Extraction</h4>
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
import SymbolExtractSettings from './SymbolExtractSettings.vue'
import LineExtractSettings from './LineExtractSettings.vue'
import MaskSettings from './MaskSettings.vue'
import ColorSettings from './ColorSettings.vue'

import { ExtractStrategy } from '@/domains/extractor'
import SymbolExtractByArea from '@/domains/extractStrategies/symbolExtractByArea'
import LineExtract from '@/domains/extractStrategies/lineExtract'
import { useCanvasStore } from '@/store'
import { ref } from 'vue'
import { useAxesStore } from '@/store/modules/axes'
import { useDatasetStore } from '@/store/modules/dataset'
import { useExtractorStore } from '@/store/modules/extractor'

export default {
  props: {
    initialExtractorStrategy: {
      type: String,
      required: false,
    },
  },
  // @ts-ignore
  setup(props: any) {
    const { canvas } = useCanvasStore()
    const { inactivateAxis } = useAxesStore()
    const { clearPlots, setPlots, sortPlots } = useDatasetStore()
    const { extractor } = useExtractorStore()
    const isExtracting = ref(false)
    const extractPlots = async () => {
      const { canvas } = useCanvasStore()
      isExtracting.value = true
      inactivateAxis()
      clearPlots()
      try {
        setPlots(extractor.value.execute(canvas.value))
        sortPlots()
      } catch (e) {
        console.error('failed to extractPlots', { cause: e })
      } finally {
        isExtracting.value = false
      }
    }
    const { setStrategy } = useExtractorStore()
    switch (props.initialExtractorStrategy) {
      case 'Symbol Extract':
        setStrategy(SymbolExtractByArea.instance)
        break
      case 'Line Extract':
        setStrategy(LineExtract.instance)
    }
    return {
      canvas,
      isExtracting,
      extractor,
      extractPlots,
    }
  },

  components: {
    SymbolExtractSettings,
    LineExtractSettings,
    MaskSettings,
    ColorSettings,
  },

  methods: {
    changeManualMode(value: any) {
      const { setManualMode } = useCanvasStore()
      const { inactivatePlots } = useDatasetStore()
      inactivatePlots()
      if (value === undefined) {
        setManualMode(-1)
        return
      }
      setManualMode(value)
    },
    setExtractStrategy(strategy: ExtractStrategy) {
      const { setStrategy } = useExtractorStore()
      switch (strategy) {
        case 'Symbol Extract':
          setStrategy(SymbolExtractByArea.instance)
          break
        case 'Line Extract':
          setStrategy(LineExtract.instance)
      }
    },
  },
}
</script>
