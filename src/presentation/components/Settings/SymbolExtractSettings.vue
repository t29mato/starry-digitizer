<template>
  <v-row class="ma-0">
    <v-col class="pa-0 mr-2">
      <v-text-field
        :model-value="symbolExtractByArea.minDiameterPx"
        @update:model-value="inputMin"
        prefix="Min: "
        suffix="px"
        type="number"
        class="ma-0"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="symbolExtractByArea.maxDiameterPx"
        @update:model-value="inputMax"
        prefix="Max: "
        suffix="px"
        type="number"
        class="ma-0"
        density="compact"
        hide-details
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'

export default defineComponent({
  data() {
    return {
      symbolExtractByArea: SymbolExtractByArea.instance,
    }
  },
  methods: {
    inputMin(value: string) {
      this.symbolExtractByArea.setMinDiameterPx(parseInt(value))
    },
    inputMax(value: string) {
      this.symbolExtractByArea.setMaxDiameterPx(parseInt(value))
    },
  },
})
</script>
