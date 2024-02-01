<template>
  <v-row class="ma-0">
    <!--  TODO: pxはappendixで追加する -->
    <v-col class="pa-0">
      <v-text-field
        :model-value="lineExtract.dxPx"
        @update:model-value="inputDxDyPx"
        label="ΔX (px)"
        type="number"
        class="ma-0"
        id="line-extract-dx"
        density="compact"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="lineExtract.dyPx"
        @update:model-value="inputDxDyPx"
        label="ΔY (px)"
        type="number"
        class="ma-0"
        id="line-extract-dy"
        density="compact"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import LineExtract from '@/application/strategies/extractStrategies/lineExtract'

export default defineComponent({
  data() {
    return {
      lineExtract: LineExtract.instance,
    }
  },

  methods: {
    inputDxDyPx(value: string) {
      this.lineExtract.setDxPx(parseInt(value))
      this.lineExtract.setDyPx(parseInt(value))
    },
  },
})
</script>
