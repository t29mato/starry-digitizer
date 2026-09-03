<template>
  <div class="mt-0">
    <h5 class="mb-0">Color</h5>
    <!-- TODO: 抽出色設定もColorSettingsComponentに入れる -->
    <div class="sd-row mt-0 ml-1 mb-0 align-center">
      <div class="sd-col-7 pa-0">
        <sd-color-picker
          data-cy="extract-color"
          :model-value="extractor.colorPicker"
          :disabled="options.readonly"
          @update:model-value="setColorPickerColor"
        ></sd-color-picker>
      </div>
      <div class="sd-col-5 pa-0">
        <sd-text-field
          :model-value="extractor.colorDistancePct"
          @update:model-value="inputColorDistancePct"
          label="Color Diff. (%)"
          type="number"
          data-cy="color-distance-pct"
          :disabled="options.readonly"
        >
        </sd-text-field>
      </div>
    </div>
    <p v-if="colorDistancePctErrorMsg" class="text-red text-caption mb-0">
      {{ colorDistancePctErrorMsg }}
    </p>
    <!-- INFO: replacement for <v-color-picker show-swatches>: the extractor
         builds `swatches` (5 columns) from the loaded image, so they are
         rendered as plain buttons rather than pulling in a picker widget. -->
    <div class="c__swatches mt-1">
      <div
        v-for="(column, columnIndex) in extractor.swatches"
        :key="columnIndex"
        class="c__swatches__column"
      >
        <button
          v-for="color in column"
          :key="color"
          type="button"
          class="c__swatches__swatch"
          :style="{ backgroundColor: color }"
          :title="color"
          :disabled="options.readonly"
          @click="setColorPickerColor(color)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { SdColorPicker, SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdColorPicker, SdTextField },
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
    setColorPickerColor(color: string) {
      this.extractor.setColorPicker(color)
    },
    inputColorDistancePct(inputValue: string | number) {
      const distance = parseInt(String(inputValue))
      this.colorDistancePctErrorMsg = ''
      if (isNaN(distance)) {
        return
      }
      if (distance < 1) {
        this.colorDistancePctErrorMsg =
          'The Color Difference(%) is supposed to be larger than 1%.'
      }
      if (100 <= distance) {
        this.colorDistancePctErrorMsg =
          'The Color Difference(%) is supposed to be smaller than 100%'
      }
      this.extractor.setColorDistancePct(distance)
    },
  },
})
</script>

<style lang="scss" scoped>
.c__swatches {
  display: flex;
  gap: 2px;

  &__column {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__swatch {
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 2px;
    cursor: pointer;

    &:disabled {
      cursor: default;
    }
  }
}
</style>
