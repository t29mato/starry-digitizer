<template>
  <div class="mt-0">
    <h5 class="mb-0">Color</h5>
    <!-- TODO: 抽出色設定もColorSettingsComponentに入れる -->
    <div class="sd-row mt-0 ml-1 mb-0 align-center">
      <div class="sd-col-5 pa-0">
        <sd-color-picker
          data-cy="extract-color"
          :model-value="extractor.colorPicker"
          :disabled="options.readonly"
          @update:model-value="setColorPickerColor"
        ></sd-color-picker>
      </div>
      <div class="sd-col-7 pa-0">
        <sd-text-field
          :model-value="extractor.colorDistancePct"
          @update:model-value="inputColorDistancePct"
          prefix="Color Diff."
          suffix="%"
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
          :class="{ 'c__swatches__swatch--active': isSelected(color) }"
          :style="{ backgroundColor: color }"
          :title="color"
          :disabled="options.readonly"
          @click="setColorPickerColor(color)"
        >
          <sd-icon
            v-if="isSelected(color)"
            :path="mdiCheck"
            :size="14"
            class="c__swatches__check"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { mdiCheck } from '@mdi/js'
import { SdColorPicker, SdIcon, SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdColorPicker, SdIcon, SdTextField },
  setup() {
    const { extractor } = useDigitizerContext()
    const options = useDigitizerOptions()
    return { extractor, options }
  },
  data() {
    return {
      mdiCheck,
      colorDistancePctErrorMsg: '',
    }
  },
  methods: {
    isSelected(color: string): boolean {
      return (
        this.extractor.colorPicker.slice(0, 7).toLowerCase() ===
        color.slice(0, 7).toLowerCase()
      )
    },
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
// INFO: mirrors v-color-picker's swatch grid (5 columns of wide chips,
// check mark on the selected one).
.c__swatches {
  display: flex;
  gap: 4px;
  margin-top: 8px;

  &__column {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__swatch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
    cursor: pointer;

    &:disabled {
      cursor: default;
    }
    &--active {
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3);
    }
  }

  &__check {
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
    border-radius: 50%;
    padding: 1px;
  }
}
</style>
