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
import { computed } from 'vue'
import { useExtractorStore } from '@/store/modules/extractor'
import { useLineExtractStore } from '@/store/modules/lineExtract'
import { useMagnifierStore } from '@/store/modules/magnifier'
import { useSymbolExtractByAreaStore } from '@/store/modules/symbolExtractByArea'

export default {
  props: {},
  setup() {
    const { magnifier } = useMagnifierStore()
    const { lineExtract } = useLineExtractStore()
    const { extractor } = useExtractorStore()
    const { symbolExtractByArea } = useSymbolExtractByAreaStore()

    const symbolMinDiameter = computed(() => {
      return symbolExtractByArea.value.minDiameterPx * magnifier.value.scale
    })

    const symbolMaxDiameter = computed(() => {
      return symbolExtractByArea.value.maxDiameterPx * magnifier.value.scale
    })

    return {
      magnifier,
      lineExtract,
      extractor,
      symbolExtractByArea,
      symbolMinDiameter,
      symbolMaxDiameter,
    }
  },
}
</script>
