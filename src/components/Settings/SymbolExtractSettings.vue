<template>
  <v-row class="ma-0">
    <v-col class="pa-0">
      <v-text-field
        :value="diameterRange.min"
        @input="inputMin"
        label="Min. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :value="diameterRange.max"
        @input="inputMax"
        label="Max. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import Vue from 'vue'
import { DiameterRange } from '../../types'
export default Vue.extend({
  computed: {},
  props: {
    diameterRange: {
      type: Object as () => DiameterRange,
      required: true,
    },
  },
  methods: {
    inputMin(value: number) {
      this.$emit(
        'input',
        Object.assign(this.$props.diameterRange, { min: value })
      )
    },
    inputMax(value: number) {
      this.$emit(
        'input',
        Object.assign(this.$props.diameterRange, { max: value })
      )
    },
  },
})
</script>
