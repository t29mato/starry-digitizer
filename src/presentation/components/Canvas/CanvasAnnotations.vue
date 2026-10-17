<template>
  <div>
    <div
      v-for="area in areas"
      :key="area.key"
      class="c__annotation"
      :style="{
        left: area.rect.xPx * canvasHandler.scale + 'px',
        top: area.rect.yPx * canvasHandler.scale + 'px',
        width: area.rect.widthPx * canvasHandler.scale + 'px',
        height: area.rect.heightPx * canvasHandler.scale + 'px',
        borderColor: area.color,
      }"
    >
      <span class="c__annotation-label" :style="{ background: area.color }">{{
        area.label
      }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { Rect } from '@/@types/types'

// INFO: Draws the active axis set's plot / legend areas (docs/design/
// auto-extraction-review-design.md, "5."). pointer-events: none so the
// canvas underneath keeps receiving clicks and drags.
export default defineComponent({
  setup() {
    const { canvasHandler, axisSetRepository } = useDigitizerContext()
    return { canvasHandler, axisSetRepository }
  },
  computed: {
    areas(): { key: string; label: string; color: string; rect: Rect }[] {
      const axisSet = this.axisSetRepository.activeAxisSet
      const areas = []
      if (axisSet.plotArea) {
        areas.push({
          key: 'plot',
          label: 'plot area',
          color: '#00897b',
          rect: axisSet.plotArea,
        })
      }
      if (axisSet.legendArea) {
        areas.push({
          key: 'legend',
          label: 'legend',
          color: '#6d4c41',
          rect: axisSet.legendArea,
        })
      }
      return areas
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__annotation {
    position: absolute;
    border: 2px dashed;
    pointer-events: none;
    z-index: 1;
  }
  &__annotation-label {
    position: absolute;
    top: -18px;
    left: -2px;
    color: white;
    font-size: 11px;
    padding: 0 4px;
    white-space: nowrap;
  }
}
</style>
