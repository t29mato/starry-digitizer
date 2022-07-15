<template>
  <div>
    <h5>Extracted Color</h5>
    <!-- TODO: 抽出色設定もColorSettingsComponentに入れる -->
    <v-row class="mt-1">
      <v-col cols="4">
        <input type="color" :value="colorPicker" @input="inputColorPicker" />
      </v-col>
      <v-col cols="8">
        <v-text-field
          :value="colorDistancePct"
          @input="inputColorDistancePct"
          label="Color Diff. (%)"
          type="number"
          :error="colorDistancePctErrorMsg.length > 0"
          :error-messages="colorDistancePctErrorMsg"
          dense
        >
        </v-text-field>
      </v-col>
    </v-row>
    <v-color-picker
      :value="colorPicker"
      @input="setColorPicker"
      hide-canvas
      hide-inputs
      show-swatches
      hide-sliders
      :swatches="swatches"
    ></v-color-picker>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      colorDistancePctErrorMsg: '',
    }
  },
  computed: {},
  props: {
    colorPicker: {
      type: String,
      required: true,
    },
    setColorPicker: {
      type: Function,
      required: true,
    },
    swatches: {
      type: Array as () => string[][],
      required: true,
    },
    colorDistancePct: {
      type: Number,
      required: true,
    },
    setColorDistancePct: {
      type: Function,
      required: true,
    },
  },
  methods: {
    inputColorPicker(inputEvent: any) {
      this.setColorPicker(inputEvent.target.value)
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
          'The Color Difference(%) is supposed to be smaller than 100%'
      }
      this.setColorDistancePct(distance)
    },
  },
})
</script>
