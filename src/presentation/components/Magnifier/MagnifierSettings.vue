<template>
  <v-dialog :model-value="shouldShowSettingsDialog" max-width="400px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Settings</span>
      </v-card-title>
      <v-card-text>
        <v-container class="pa-0">
          <v-row>
            <v-col cols="6" class="py-2">
              <v-text-field
                :model-value="magnifier.scale"
                type="number"
                label="Magnifier (times)"
                @change="onChangeMagnifierScale"
                :error="magnifierSettingError.length > 0"
                :error-messages="magnifierSettingError"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>
            <v-col cols="6" class="py-2">
              <v-text-field
                :model-value="magnifier.effectiveDigits"
                type="number"
                label="Effective digits"
                @change="onChangeEffectiveDigits"
                :error="effectiveDigitsError.length > 0"
                :error-messages="effectiveDigitsError"
                variant="outlined"
                density="compact"
                hide-details="auto"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col class="py-1">
              <v-checkbox
                v-model="axisSetRepository.activeAxisSet.considerGraphTilt"
                label="Consider graph tilt"
                density="compact"
                hide-details
                color="primary"
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="toggleSettingsDialog"> Close </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { magnifier } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      magnifier,
      axisSetRepository,
      effectiveDigitsError: '',
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
  },
})
</script>
