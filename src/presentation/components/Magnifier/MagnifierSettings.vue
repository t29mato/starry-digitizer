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
             view-only magnifier settings and stay editable.
             "Effective digits" used to sit here too; it governs every
             extracted value the library hands out, not the magnifier, so it
             now lives with the data table (see DataTable.vue). -->
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
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
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
