<template>
  <div class="sd-row ma-0">
    <div class="sd-col pa-0 mr-2">
      <sd-text-field
        :model-value="symbolExtractByArea.minDiameterPx"
        @update:model-value="inputMin"
        :disabled="options.readonly"
        prefix="Min:"
        suffix="px"
        type="number"
        class="ma-0"
        id="symbol-extract-min"
      ></sd-text-field>
    </div>
    <div class="sd-col pa-0">
      <sd-text-field
        :model-value="symbolExtractByArea.maxDiameterPx"
        @update:model-value="inputMax"
        :disabled="options.readonly"
        prefix="Max:"
        suffix="px"
        type="number"
        class="ma-0"
        id="symbol-extract-max"
      ></sd-text-field>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdTextField },
  setup() {
    const { extractor } = useDigitizerContext()
    return { options: useDigitizerOptions(), extractor }
  },
  computed: {
    // INFO: this digitizer instance's own Symbol Extract strategy — not a
    // shared singleton, so two <StarryDigitizer> on one page keep separate
    // min/max diameters.
    symbolExtractByArea(): SymbolExtractByArea {
      return this.extractor.symbolExtractByArea
    },
  },
  methods: {
    // INFO: ignore the transient non-numeric value SdTextField emits while
    // the field is empty mid-edit, so the strategy never sees NaN.
    inputMin(value: string | number) {
      const parsed = parseInt(String(value))
      if (!isNaN(parsed)) {
        this.symbolExtractByArea.setMinDiameterPx(parsed)
      }
    },
    inputMax(value: string | number) {
      const parsed = parseInt(String(value))
      if (!isNaN(parsed)) {
        this.symbolExtractByArea.setMaxDiameterPx(parsed)
      }
    },
  },
})
</script>
