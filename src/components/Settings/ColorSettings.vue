<template>
  <div class="mt-3 mb-5">
    <h5 class="mb-2">Extracted Color</h5>
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
      :elevation="0"
    ></v-color-picker>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useExtractorStore } from '@/store/extractor'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  data() {
    return {
      colorDistancePctErrorMsg: '',
    }
  },
  computed: {
    ...mapState(useExtractorStore, ['extractor']),
  },

  methods: {
    ...mapActions(useExtractorStore, ['setColorPicker', 'setColorDistancePct']),
    inputColorPicker(value: any) {
      console.log(value)
      this.setColorPicker(value.target.value)
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
      this.setColorDistancePct(distance)
    },
  },
})
</script>
