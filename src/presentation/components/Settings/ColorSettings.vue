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
          density
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
    ></v-color-picker>
  </div>
</template>

<script lang="ts">
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      colorDistancePctErrorMsg: '',
      extractor,
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
