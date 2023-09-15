<template>
  <v-dialog :model-value="shouldShowSettingsDialog" max-width="300px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Magnifier Settings</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col>
              <v-text-field
                :model-value="magnifier.scale"
                type="number"
                label="Magnifier (times)"
                @change="onChangeMagnifierScale"
                :error="magnifierSettingError.length > 0"
                :error-messages="magnifierSettingError"
              ></v-text-field>
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
import { defineComponent } from 'vue'

import { useMagnifierStore } from '@/store/magnifier'
import { mapState } from 'pinia'

export default defineComponent({
  data() {
    return {}
  },
  computed: {
    ...mapState(useMagnifierStore, ['magnifier']),
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
  },
})
</script>
