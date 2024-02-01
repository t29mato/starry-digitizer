<template>
  <div class="mb-5">
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
          :isVisible="datasets.activeDataset.visiblePlotIds.includes(plot.id)"
          :isManuallyAdded="
            datasets.activeDataset.manuallyAddedPlotIds.includes(plot.id)
          "
        ></magnifier-plots>
      </div>
      <div v-for="plot in datasets.activeDataset.tempPlots" :key="plot.id">
        <magnifier-plots
          :plot="plot"
          :magnifierSize="magnifier.sizePx"
          :isActive="datasets.activeDataset.activePlotIds.includes(plot.id)"
          :isVisible="true"
          :isTemporary="true"
          :isManuallyAdded="false"
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
import { defineComponent } from 'vue'

import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxes from './MagnifierAxes.vue'
import MagnifierPlots from './MagnifierPlots.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import MagnifierExtractSize from '@/presentation/components/Magnifier/MagnifierExtractSize.vue'
import XYAxesCalculator from '@/domain/services/XYAxesCalculator'

import { useDatasetsStore } from '@/store/datasets'
import { mapState } from 'pinia'
import { Magnifier } from '@/application/services/magnifier/magnifier'
import { CanvasHandler } from '@/application/services/canvasHandler/canvasHandler'
import { AxisRepositoryManager } from '@/domain/repositories/axisRepository/manager/axisRepositoryManager'

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
  data() {
    return {
      magnifierSettingError: '',
      shouldShowSettingsDialog: false,
      magnifier: Magnifier.getInstance(),
      canvasHandler: CanvasHandler.getInstance(),
      axes: AxisRepositoryManager.getInstance(),
    }
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
    // magnifierHalfSize(): number {
    //   return this.magnifier.sizePx / 2
    // },
    // INFO: 小数点ありのピクセル表示するとユーザーを混乱させるので表示上は切り上げ
    // canvasCursorCeil(): {
    //   xPx: number
    //   yPx: number
    // } {
    //   return {
    //     xPx: Math.ceil(this.canvasCursor.xPx),
    //     yPx: Math.ceil(this.canvasCursor.yPx),
    //   }
    // },
    xyValue(): {
      xV: string
      yV: string
    } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      const calculator = new XYAxesCalculator(this.axes, {
        x: this.axes.xIsLog,
        y: this.axes.yIsLog,
      })
      return calculator.calculateXYValues(
        this.canvasHandler.cursor.xPx,
        this.canvasHandler.cursor.yPx,
      )
    },
  },
  methods: {
    toggleSettingsDialog(): void {
      this.shouldShowSettingsDialog = !this.shouldShowSettingsDialog
    },
    setMagnifierScale(value: string): void {
      const scale = parseInt(value)
      this.magnifierSettingError = ''
      if (scale < 2) {
        this.magnifierSettingError =
          'The Magnifier scale is supposed to be larger than 2 times.'
        this.magnifier.setScale(2)
        return
      }
      this.magnifier.setScale(parseInt(value))
    },
  },
})
</script>
