<template>
  <div>
    <v-text-field
      :value="diameterRange.min"
      @input="inputMin"
      label="Min. Diameter (px)"
      hide-details
      type="number"
    ></v-text-field>
    <v-text-field
      :value="diameterRange.max"
      @input="inputMax"
      label="Max. Diameter (px)"
      hide-details
      type="number"
    ></v-text-field>
  </div>
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
    isLog: {
      type: Object,
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
