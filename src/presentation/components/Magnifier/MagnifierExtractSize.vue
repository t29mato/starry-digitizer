<template>
  <div>
    <div
      v-if="extractor.strategy.name === 'Line Extract'"
      :style="{
        position: 'absolute',
        left: `${
          (magnifier.sizePx - lineExtract.dxPx * magnifier.scale) / 2
        }px`,
        top: `${(magnifier.sizePx - lineExtract.dxPx * magnifier.scale) / 2}px`,
        width: `${lineExtract.dxPx * magnifier.scale}px`,
        height: `${lineExtract.dxPx * magnifier.scale}px`,
        border: '1px dotted grey',
        zIndex: 5,
      }"
    ></div>
    <div v-if="extractor.strategy.name === 'Symbol Extract'">
      <div
        :style="{
          position: 'absolute',
          left: `${(magnifier.sizePx - symbolMinDiameter) / 2}px`,
          top: `${(magnifier.sizePx - symbolMinDiameter) / 2}px`,
          width: `${symbolMinDiameter}px`,
          height: `${symbolMinDiameter}px`,
          border: '1px dotted grey',
          zIndex: 5,
        }"
      ></div>
      <div
        :style="{
          position: 'absolute',
          left: `${(magnifier.sizePx - symbolMaxDiameter) / 2}px`,
          top: `${(magnifier.sizePx - symbolMaxDiameter) / 2}px`,
          width: `${symbolMaxDiameter}px`,
          height: `${symbolMaxDiameter}px`,
          border: '1px dotted grey',
          zIndex: 5,
        }"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { magnifier } from '@/instanceStore/applicationServiceInstances'
import LineExtract from '@/application/strategies/extractStrategies/lineExtract'
import SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea'

export default defineComponent({
  data() {
    return {
      extractor,
magnifier,
      lineExtract: LineExtract.instance,
      symbolExtractByArea: SymbolExtractByArea.instance,
    }
  },
  computed: {
    symbolMinDiameter(): number {
      return this.symbolExtractByArea.minDiameterPx * this.magnifier.scale
    },
    symbolMaxDiameter(): number {
      return this.symbolExtractByArea.maxDiameterPx * this.magnifier.scale
    },
  },
})
</script>
