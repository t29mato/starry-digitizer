<template>
  <v-dialog :value="shouldShowSettingsDialog" max-width="300px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Magnifier Settings</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col>
              <v-text-field
                :value="magnifier.scale"
                type="number"
                label="Magnifier (times)"
                @input="setMagnifierScale"
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
import { defineComponent } from "vue";


export default defineComponent({
  data() {
    return {}
  },
  computed: {
    ...mapGetters('magnifier', { magnifier: 'magnifier' }),
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
  methods: {},
})
</script>
