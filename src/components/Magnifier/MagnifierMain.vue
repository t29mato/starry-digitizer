<template>
  <div>
    <div
      :style="{
        overflow: 'hidden',
        width: `${magnifier.sizePx}px`,
        height: `${magnifier.sizePx}px`,
        position: 'relative',
        outline: '1px solid grey',
      }"
    >
      <magnifier-settings-btn
        :toggleSettingsDialog="toggleSettingsDialog"
      ></magnifier-settings-btn>
      <magnifier-image></magnifier-image>
      <div v-for="plot in datasets.activeDataset.plots" :key="plot.id">
        <magnifier-plots
          :plot="plot"
          :magnifierSize="magnifier.sizePx"
          :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
        ></magnifier-plots>
      </div>
      <magnifier-extract-size></magnifier-extract-size>
      <magnifier-axes></magnifier-axes>
      <magnifier-vertical-line></magnifier-vertical-line>
      <magnifier-horizontal-line></magnifier-horizontal-line>
    </div>
    <span>x: {{ xyValue.xV }}, y: {{ xyValue.yV }}</span>
    <magnifier-settings
      :shouldShowSettingsDialog="shouldShowSettingsDialog"
      :toggleSettingsDialog="toggleSettingsDialog"
      :magnifierSettingError="magnifierSettingError"
      :setMagnifierScale="setMagnifierScale"
    ></magnifier-settings>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxes from './MagnifierAxes.vue'
import MagnifierPlots from './MagnifierPlots.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import MagnifierExtractSize from '@/components/Magnifier/MagnifierExtractSize.vue'
import { useDatasetStore } from '@/store/modules/dataset'
import { useCanvasStore } from '@/store/modules/canvas'
import { useMagnifierStore } from '@/store/modules/magnifier'
import { useAxesStore } from '@/store/modules/axes'
import XYAxesCalculator from '@/domains/XYAxesCalculator'

export default defineComponent({
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxes,
    MagnifierPlots,
    MagnifierSettings,
    MagnifierSettingsBtn,
    MagnifierExtractSize,
  },
  setup() {
    const magnifierSettingError = ref('')
    const shouldShowSettingsDialog = ref(false)

    const { datasets } = useDatasetStore()
    const { canvas } = useCanvasStore()
    const { magnifier } = useMagnifierStore()
    const { axes } = useAxesStore()

    const xyValue = computed(() => {
      const calculator = new XYAxesCalculator(axes.value, {
        x: axes.value.xIsLog,
        y: axes.value.yIsLog,
      })
      return calculator.calculateXYValues(
        canvas.value.cursor.xPx,
        canvas.value.cursor.yPx
      )
    })

    const toggleSettingsDialog = () => {
      shouldShowSettingsDialog.value = !shouldShowSettingsDialog.value
    }

    const setMagnifierScale = (value: string) => {
      const scale = parseInt(value)
      magnifierSettingError.value = ''
      if (scale < 2) {
        magnifierSettingError.value =
          'The Magnifier scale is supposed to be larger than 2 times.'
        magnifier.value.setScale(2)
        return
      }
      magnifier.value.setScale(parseInt(value))
    }

    return {
      magnifierSettingError,
      shouldShowSettingsDialog,
      datasets,
      canvas,
      magnifier,
      axes,
      xyValue,
      toggleSettingsDialog,
      setMagnifierScale,
    }
  },
})
</script>
