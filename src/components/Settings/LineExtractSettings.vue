<template>
  <v-row class="ma-0">
    <v-text-field
      :value="lineExtract.lineWidthPx"
      @input="inputWidth"
      label="Min. Line Width (px)"
      type="number"
      class="ma-0 pl-4"
    ></v-text-field>
    <v-text-field
      :value="lineExtract.intervalPx"
      @input="inputInterval"
      label="X Direction Interval (px)"
      type="number"
      class="ma-0 pl-4"
    ></v-text-field>
  </v-row>
</template>

<script lang="ts">
import { lineExtractMapper } from '@/store/modules/lineExtract'
import Vue from 'vue'
export default Vue.extend({
  computed: {
    ...lineExtractMapper.mapGetters(['lineExtract']),
  },
  props: {},
  methods: {
    ...lineExtractMapper.mapActions(['setIntervalPx', 'setLineWidthPx']),
    inputWidth(value: string) {
      this.setLineWidthPx(parseInt(value))
    },
    inputInterval(value: string) {
      this.setIntervalPx(parseInt(value))
    },
  },
})
</script>
