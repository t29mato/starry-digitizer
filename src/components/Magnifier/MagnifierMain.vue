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
import Vue from 'vue'
import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxes from './MagnifierAxes.vue'
import MagnifierPlots from './MagnifierPlots.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import MagnifierExtractSize from '@/components/Magnifier/MagnifierExtractSize.vue'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { axesMapper } from '@/store/modules/axes'
import XYAxesCalculator from '@/domains/XYAxesCalculator'

export default Vue.extend({
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
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...canvasMapper.mapGetters(['canvas']),
    ...magnifierMapper.mapGetters(['magnifier']),
    ...axesMapper.mapGetters(['axes']),
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
        this.canvas.cursor.xPx,
        this.canvas.cursor.yPx
      )
    },
  },
  props: {},

  methods: {
    ...magnifierMapper.mapActions(['setScale']),
    showAxisName(index: number): string {
      switch (index) {
        case 0:
          return 'x1'
        case 1:
          return 'x2'
        case 2:
          return 'y1'
        case 3:
          return 'y2'
        default:
          return '-'
      }
    },
    toggleSettingsDialog(): void {
      this.shouldShowSettingsDialog = !this.shouldShowSettingsDialog
    },
    setMagnifierScale(value: string): void {
      const scale = parseInt(value)
      this.magnifierSettingError = ''
      if (scale < 2) {
        this.magnifierSettingError =
          'The Magnifier scale is supposed to be larger than 2 times.'
        this.setScale(2)
        return
      }
      this.setScale(parseInt(value))
    },
  },
})
</script>
