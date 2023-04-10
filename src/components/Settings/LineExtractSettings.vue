<template>
  <v-row class="ma-0">
    <!--  TODO: pxはappendixで追加する -->
    <v-col class="pa-0">
      <v-text-field
        :value="lineExtract.dxPx"
        @input="inputDxDyPx"
        label="ΔX (px)"
        type="number"
        class="ma-0 pl-4"
        id="line-extract-dx"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :value="lineExtract.dyPx"
        @input="inputDxDyPx"
        label="ΔY (px)"
        type="number"
        class="ma-0 pl-4"
        id="line-extract-dy"
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
    inputDxDyPx(value: string) {
      this.setDxPx(parseInt(value))
      this.setDyPx(parseInt(value))
    },
  },
})
</script>
