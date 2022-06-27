<template>
  <div>
    <v-text-field
      :value="diameter.min"
      @input="inputMin"
      label="Min. Diameter (px)"
      hide-details
      type="number"
    ></v-text-field>
    <v-text-field
      :value="diameter.max"
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
    diameter: {
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
      this.$emit('input', Object.assign(this.$props.diameter, { min: value }))
    },
    inputMax(value: number) {
      this.$emit('input', Object.assign(this.$props.diameter, { max: value }))
    },
  },
})
</script>
