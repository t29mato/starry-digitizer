<template>
  <v-row class="ma-0">
    <v-col class="pa-0">
      <v-text-field
        :model-value="symbolExtractByArea.minDiameterPx"
        @update:model-value="inputMin"
        label="Min. Diameter (px)"
        type="number"
        class="ma-0"
        density="compact"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="symbolExtractByArea.maxDiameterPx"
        @update:model-value="inputMax"
        label="Max. Diameter (px)"
        type="number"
        class="ma-0"
        density="compact"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useSymbolExtractByAreaStore } from '@/store/symbolExtractByArea'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  computed: {
    ...mapState(useSymbolExtractByAreaStore, ['symbolExtractByArea']),
  },

  methods: {
    ...mapActions(useSymbolExtractByAreaStore, [
      'setMinDiameterPx',
      'setMaxDiameterPx',
    ]),
    inputMin(value: string) {
      this.setMinDiameterPx(parseInt(value))
    },
    inputMax(value: string) {
      this.setMaxDiameterPx(parseInt(value))
    },
  },
})
</script>
