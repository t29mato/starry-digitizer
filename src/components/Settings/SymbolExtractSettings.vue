<template>
  <v-row class="ma-0">
    <v-col class="pa-0">
      <v-text-field
        :model-value="symbolExtractByArea.minDiameterPx"
        @update:model-value="inputMin"
        label="Min. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="symbolExtractByArea.maxDiameterPx"
        @update:model-value="inputMax"
        label="Max. Diameter (px)"
        type="number"
        class="ma-0 pl-4"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useSymbolExtractByAreaStore } from '@/store/modules/symbolExtractByArea'
export default {
  setup() {
    const { symbolExtractByArea } = useSymbolExtractByAreaStore()
    return {
      symbolExtractByArea,
    }
  },
  props: {},
  methods: {
    inputMin(value: string) {
      const { setMinDiameterPx } = useSymbolExtractByAreaStore()
      setMinDiameterPx(parseInt(value))
    },
    inputMax(value: string) {
      const { setMaxDiameterPx } = useSymbolExtractByAreaStore()
      setMaxDiameterPx(parseInt(value))
    },
  },
}
</script>
