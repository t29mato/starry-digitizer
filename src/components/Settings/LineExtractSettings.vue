<template>
  <v-row class="ma-0">
    <!--  TODO: pxはappendixで追加する -->
    <v-col class="pa-0">
      <v-text-field
        :model-value="lineExtract.dxPx"
        @update:model-value="inputDxDyPx"
        label="ΔX (px)"
        type="number"
        class="ma-0 pl-4"
        id="line-extract-dx"
      ></v-text-field>
    </v-col>
    <v-col class="pa-0">
      <v-text-field
        :model-value="lineExtract.dyPx"
        @update:model-value="inputDxDyPx"
        label="ΔY (px)"
        type="number"
        class="ma-0 pl-4"
        id="line-extract-dy"
      ></v-text-field>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useLineExtractStore } from '@/store/modules/lineExtract'

export default {
  setup() {
    const { lineExtract } = useLineExtractStore()
    return {
      lineExtract,
    }
  },
  computed: {},
  props: {},
  methods: {
    inputDxDyPx(value: string) {
      const { setDxPx, setDyPx } = useLineExtractStore()
      setDxPx(parseInt(value))
      setDyPx(parseInt(value))
    },
  },
}
</script>
