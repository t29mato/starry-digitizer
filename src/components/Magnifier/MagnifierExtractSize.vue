<template>
  <div
    v-if="extractor.strategy.name === 'Line Extract'"
    :style="{
      position: 'absolute',
      left: `${(magnifier.sizePx - lineExtract.dxPx * magnifier.scale) / 2}px`,
      top: `${(magnifier.sizePx - lineExtract.dxPx * magnifier.scale) / 2}px`,
      width: `${lineExtract.dxPx * magnifier.scale}px`,
      height: `${lineExtract.dxPx * magnifier.scale}px`,
      border: '1px dotted grey',
    }"
  />
  <div v-else-if="extractor.strategy.name === 'Symbol Extract'">
    <div
      :style="{
        position: 'absolute',
        left: `${(magnifier.sizePx - symbolMinDiameter) / 2}px`,
        top: `${(magnifier.sizePx - symbolMinDiameter) / 2}px`,
        width: `${symbolMinDiameter}px`,
        height: `${symbolMinDiameter}px`,
        border: '1px dotted grey',
      }"
    />
    <div
      :style="{
        position: 'absolute',
        left: `${(magnifier.sizePx - symbolMaxDiameter) / 2}px`,
        top: `${(magnifier.sizePx - symbolMaxDiameter) / 2}px`,
        width: `${symbolMaxDiameter}px`,
        height: `${symbolMaxDiameter}px`,
        border: '1px dotted grey',
      }"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useMagnifierStore } from '@/store/magnifier'
import { useLineExtractStore } from '@/store/lineExtract'
import { useExtractorStore } from '@/store/extractor'
import { useSymbolExtractByAreaStore } from '@/store/symbolExtractByArea'

const magnifierStore = useMagnifierStore()
const lineExtractStore = useLineExtractStore()
const extractorStore = useExtractorStore()
const symbolExtractByAreaStore = useSymbolExtractByAreaStore()

export default defineComponent({
  props: {},
  computed: {
    magnifier: () => magnifierStore.magnifier,
    lineExtract: () => lineExtractStore.lineExtract,
    extractor: () => extractorStore.extractor,
    symbolExtractByArea: () => symbolExtractByAreaStore.symbolExtractByArea,
    symbolMinDiameter(): number {
      return this.symbolExtractByArea.minDiameterPx * this.magnifier.scale
    },
    symbolMaxDiameter(): number {
      return this.symbolExtractByArea.maxDiameterPx * this.magnifier.scale
    },
  },
})
</script>
