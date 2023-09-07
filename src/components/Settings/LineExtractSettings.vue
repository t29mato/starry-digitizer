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

import { useLineExtractStore } from '@/store/lineExtract'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  computed: {
    ...mapState(useLineExtractStore, ['lineExtract']),
  },

  methods: {
    ...mapActions(useLineExtractStore, ['setDyPx', 'setDxPx']),
    inputDxDyPx(value: string) {
      this.setDxPx(parseInt(value))
      this.setDyPx(parseInt(value))
    },
  },
})
</script>
