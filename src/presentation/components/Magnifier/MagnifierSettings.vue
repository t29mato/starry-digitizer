<template>
  <sd-dialog
    :model-value="shouldShowSettingsDialog"
    @update:model-value="toggleSettingsDialog()"
    title="Settings"
    :max-width="400"
  >
    <div class="sd-row">
      <div class="sd-col-6 py-2">
        <sd-text-field
          :model-value="magnifier.scale"
          type="number"
          label="Magnifier (times)"
          @change="onChangeMagnifierScale"
        ></sd-text-field>
        <p v-if="magnifierSettingError" class="c__error text-caption text-red">
          {{ magnifierSettingError }}
        </p>
      </div>
      <div class="sd-col-6 py-2">
        <sd-text-field
          :model-value="magnifier.effectiveDigits"
          type="number"
          label="Effective digits"
          @change="onChangeEffectiveDigits"
        ></sd-text-field>
        <p v-if="effectiveDigitsError" class="c__error text-caption text-red">
          {{ effectiveDigitsError }}
        </p>
      </div>
    </div>
    <div class="sd-row">
      <div class="sd-col-6 py-2">
        <sd-text-field
          :model-value="magnifier.markerSizePx"
          type="number"
          label="Marker size (px)"
          @change="onChangeMarkerSizePx"
        ></sd-text-field>
        <p v-if="markerSizeError" class="c__error text-caption text-red">
          {{ markerSizeError }}
        </p>
      </div>
    </div>
    <div class="sd-row">
      <div class="sd-col py-2">
        <!-- INFO: considerGraphTilt mutates the axis set (project data),
             so it is disabled in readonly mode. The other fields above are
             view-only magnifier settings and stay editable. -->
        <sd-checkbox
          v-model="axisSetRepository.activeAxisSet.considerGraphTilt"
          :disabled="options.readonly"
          label="Consider graph tilt"
        ></sd-checkbox>
      </div>
    </div>
    <template #actions>
      <sd-button @click="toggleSettingsDialog()">Close</sd-button>
    </template>
  </sd-dialog>
</template>

<script lang="ts">
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { defineComponent } from 'vue'
import { SdButton, SdCheckbox, SdDialog, SdTextField } from '@/presentation/ui'

export default defineComponent({
  components: { SdButton, SdCheckbox, SdDialog, SdTextField },
  setup() {
    const { magnifier, axisSetRepository } = useDigitizerContext()
    const options = useDigitizerOptions()
    return { magnifier, axisSetRepository, options }
  },
  data() {
    return {
      effectiveDigitsError: '',
      markerSizeError: '',
    }
  },
  props: {
    shouldShowSettingsDialog: {
      type: Boolean,
      required: true,
    },
    toggleSettingsDialog: {
      type: Function,
      required: true,
    },
    magnifierSettingError: {
      type: String,
      required: true,
    },
    setMagnifierScale: {
      type: Function,
      required: true,
    },
  },
  methods: {
    onChangeMagnifierScale(event: Event) {
      this.setMagnifierScale(Number((<HTMLInputElement>event.target).value))
    },
    onChangeEffectiveDigits(event: Event) {
      const digits = parseInt((<HTMLInputElement>event.target).value)
      this.effectiveDigitsError = ''
      if (digits < 1 || digits > 10) {
        this.effectiveDigitsError = 'Value must be between 1 and 10'
        return
      }
      this.magnifier.setEffectiveDigits(digits)
    },
    onChangeMarkerSizePx(event: Event) {
      const sizePx = Number((<HTMLInputElement>event.target).value)
      this.markerSizeError = ''
      if (sizePx < 1) {
        this.markerSizeError = 'Value must be at least 1'
        return
      }
      this.magnifier.setMarkerSizePx(sizePx)
    },
  },
})
</script>

<style lang="scss" scoped>
.c__error {
  margin: 2px 0 0;
}
</style>
