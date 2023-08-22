<template>
  <div class="mt-3">
    <h5>Extracted Color</h5>
    <!-- TODO: 抽出色設定もColorSettingsComponentに入れる -->
    <v-row class="mt-1">
      <v-col cols="4">
        <label class="d-flex">
          <input
            type="color"
            :value="extractor.colorPicker"
            @input="inputColorPicker"
          />
          <v-icon size="small">mdi-palette</v-icon>
        </label>
      </v-col>
      <v-col cols="8">
        <v-text-field
          :model-value="extractor.colorDistancePct"
          @update:model-value="inputColorDistancePct"
          label="Color Diff. (%)"
          type="number"
          :error="colorDistancePctErrorMsg.length > 0"
          :error-messages="colorDistancePctErrorMsg"
          density="compact"
        >
        </v-text-field>
      </v-col>
    </v-row>
    <v-color-picker
      :model-value="extractor.colorPicker"
      @update:model-value="setColorPicker"
      hide-canvas
      hide-inputs
      show-swatches
      hide-sliders
      :swatches="extractor.swatches"
    ></v-color-picker>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'
import { useExtractorStore } from '@/store/modules/extractor'
export default {
  setup() {
    const { extractor } = useExtractorStore()
    const colorDistancePctErrorMsg = ref('')

    const inputColorPicker = (value: string) => {
      const { setColorPicker } = useExtractorStore()
      setColorPicker(value)
    }

    const inputColorDistancePct = (inputValue: string) => {
      const distance = parseInt(inputValue)
      const { setColorDistancePct } = useExtractorStore()
      colorDistancePctErrorMsg.value = '' // Use .value to update ref
      if (distance < 1) {
        colorDistancePctErrorMsg.value =
          'The Color Difference(%) is supposed to be larger than 1%.'
      }
      if (distance >= 100) {
        colorDistancePctErrorMsg.value =
          'The Color Difference(%) is supposed to be smaller than 100%'
      }
      setColorDistancePct(distance)
    }

    return {
      extractor,
      colorDistancePctErrorMsg, // Use ref here
      inputColorPicker,
      inputColorDistancePct,
    }
  },
}
</script>
