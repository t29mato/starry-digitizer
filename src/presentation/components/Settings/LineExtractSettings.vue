<template>
  <v-row class="ma-0">
    <!--  TODO: pxはappendixで追加する -->
    <v-col class="pa-0 mr-2">
      <v-text-field
        :model-value="lineExtract.dxPx"
        @update:model-value="inputDxDyPx"
        prefix="ΔX: "
        suffix="px"
        type="number"
        class="ma-0"
        id="line-extract-dx"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="lineExtract.dyPx"
        @update:model-value="inputDxDyPx"
        prefix="ΔY: "
        suffix="px"
        type="number"
        class="ma-0"
        id="line-extract-dy"
        density="compact"
        hide-details
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
