<template>
  <div class="mt-0">
    <h5 class="mb-0">Color</h5>
    <!-- TODO: 抽出色設定もColorSettingsComponentに入れる -->
    <v-row class="mt-0 ml-1 mb-0">
      <v-col cols="4" class="pa-0">
        <label class="d-flex">
          <input
            type="color"
            :value="extractor.colorPicker"
            :disabled="options.readonly"
            @input="handleOnInputColorPalette"
          />
          <v-icon size="small">mdi-palette</v-icon>
        </label>
      </v-col>
      <v-col cols="8" class="pa-0">
        <v-text-field
          :model-value="extractor.colorDistancePct"
          @update:model-value="inputColorDistancePct"
          prefix="Color Diff."
          suffix="%"
          type="number"
          hide-details
          :error="colorDistancePctErrorMsg.length > 0"
          :error-messages="colorDistancePctErrorMsg"
          density="compact"
          :disabled="options.readonly"
        >
        </v-text-field>
      </v-col>
    </v-row>
    <v-color-picker
      :model-value="extractor.colorPicker"
      @update:model-value="handleOnSelectColor"
      hide-canvas
      hide-inputs
      show-swatches
      hide-sliders
      :swatches="extractor.swatches"
      :elevation="0"
      :disabled="options.readonly"
    ></v-color-picker>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'

export default defineComponent({
  setup() {
    const { extractor } = useDigitizerContext()
    const options = useDigitizerOptions()
    return { extractor, options }
  },
  data() {
    return {
      colorDistancePctErrorMsg: '',
    }
  },
  methods: {
    handleOnInputColorPalette(value: any) {
      this.setColorPickerColor(value.target.value)
    },
    handleOnSelectColor(value: any) {
      this.setColorPickerColor(value)
    },
    setColorPickerColor(color: any) {
      this.extractor.setColorPicker(color)
    },
    inputColorDistancePct(inputValue: string) {
      const distance = parseInt(inputValue)
      this.colorDistancePctErrorMsg = ''
      if (distance < 1) {
        this.colorDistancePctErrorMsg =
          'The Color Difference(%) is supposed to be larger than 1%.'
      }
      if (100 <= distance) {
        this.colorDistancePctErrorMsg =
          'The Color Difference(%) is supposed to be size="small"er than 100%'
      }
      this.extractor.setColorDistancePct(distance)
    },
  },
})
</script>
