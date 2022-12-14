<template>
  <v-row class="ma-0">
    <!--  TODO: pxはappendixで追加する -->
    <v-col class="pa-0">
      <v-text-field
        :value="lineExtract.dxPx"
        @input="inputDxPx"
        label="ΔX (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :value="lineExtract.dyPx"
        @input="inputDyPx"
        label="ΔY (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
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
    ...lineExtractMapper.mapActions(['setDyPx', 'setDxPx']),
    inputDxPx(value: string) {
      this.setDxPx(parseInt(value))
    },
    inputDyPx(value: string) {
      this.setDyPx(parseInt(value))
    },
  },
})
</script>
