<template>
  <v-row class="ma-0">
    <v-text-field
      :value="settings.width"
      @input="inputWidth"
      label="Min. Line Width (px)"
      type="number"
      class="ma-0 pl-4"
    ></v-text-field>
    <v-text-field
      :value="settings.interval"
      @input="inputInterval"
      label="X Direction Interval (px)"
      type="number"
      class="ma-0 pl-4"
    ></v-text-field>
  </v-row>
</template>

<script lang="ts">
import { LineExtractProps } from '@/types'
import Vue from 'vue'
export default Vue.extend({
  computed: {},
  props: {
    settings: {
      type: Object as () => LineExtractProps,
      required: true,
    },
  },
  methods: {
    inputWidth(value: number) {
      this.$emit('input', Object.assign(this.$props.settings, { width: value }))
    },
    inputInterval(value: number) {
      this.$emit(
        'input',
        Object.assign(this.$props.settings, { interval: value })
      )
    },
  },
})
</script>
