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
import { defineComponent } from 'vue'

import { useLineExtractStore } from '@/store/lineExtract'

const lineExtractStore = useLineExtractStore()

export default defineComponent({
  computed: {
    lineExtract: () => lineExtractStore.lineExtract,
  },
  props: {},
  methods: {
    ...mapActions('lineExtract', ['setDyPx', 'setDxPx']),
    inputDxDyPx(value: string) {
      this.setDxPx(parseInt(value))
      this.setDyPx(parseInt(value))
    },
  },
})
</script>
