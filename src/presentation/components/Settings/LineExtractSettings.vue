<template>
  <div class="sd-row ma-0">
    <div class="sd-col pa-0 mr-2">
      <sd-text-field
        :model-value="lineExtract.dxPx"
        @update:model-value="inputDxDyPx"
        prefix="ΔX:"
        suffix="px"
        type="number"
        class="ma-0"
        id="line-extract-dx"
        :disabled="options.readonly"
      ></sd-text-field>
    </div>
    <div class="sd-col pa-0">
      <sd-text-field
        :model-value="lineExtract.dyPx"
        @update:model-value="inputDxDyPx"
        prefix="ΔY:"
        suffix="px"
        type="number"
        class="ma-0"
        id="line-extract-dy"
        :disabled="options.readonly"
      ></sd-text-field>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import LineExtract from '@/application/strategies/extractStrategies/lineExtract'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdTextField },
  setup() {
    return { options: useDigitizerOptions() }
  },
  data() {
    return {
      lineExtract: LineExtract.instance,
    }
  },

  methods: {
    // INFO: SdTextField with type="number" emits a number once the input
    // parses, and the raw string while it is mid-edit ("", "-").
    inputDxDyPx(value: string | number) {
      const parsed = parseInt(String(value))
      if (isNaN(parsed)) {
        return
      }
      this.lineExtract.setDxPx(parsed)
      this.lineExtract.setDyPx(parsed)
    },
  },
})
</script>
