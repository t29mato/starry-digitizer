<template>
  <div>
    <div
      :style="{
        overflow: 'hidden',
        width: `${magnifierSizePx}px`,
        height: `${magnifierSizePx}px`,
        position: 'relative',
        outline: '1px solid grey',
      }"
    >
      <magnifier-settings-btn
        :toggleSettingsDialog="toggleSettingsDialog"
      ></magnifier-settings-btn>
      <magnifier-image
        :src="uploadImageUrl"
        :magnifierScale="magnifierScale"
        :canvasScale="canvasScale"
        :cursorX="canvasCursor.xPx / canvasScale"
        :cursorY="canvasCursor.yPx / canvasScale"
        :size="magnifierSizePx"
      ></magnifier-image>
      <magnifier-vertical-line
        :magnifierSize="magnifierSizePx"
        :crosshairSizePx="crosshairSizePx"
      ></magnifier-vertical-line>
      <magnifier-horizontal-line
        :magnifierSize="magnifierSizePx"
        :crosshairSizePx="crosshairSizePx"
      ></magnifier-horizontal-line>
      <div v-for="(axis, index) in axes" :key="'axes' + index">
        <magnifier-axes
          :axis="axis"
          :isActive="isMovingAxis && movingAxisIndex === index"
          :index="index"
          :axesSize="axesSizePx"
          :canvasScale="canvasScale"
          :canvasCursor="canvasCursor"
          :magnifierScale="magnifierScale"
          :magnifierSize="magnifierSizePx"
          :label="showAxisName(index)"
        ></magnifier-axes>
      </div>
      <div v-for="plot in plots" v-show="shouldShowPoints" :key="plot.id">
        <magnifier-plots
          :magnifierScale="magnifierScale"
          :canvasScale="canvasScale"
          :cursor="canvasCursor"
          :plotSize="plotSizePx"
          :plot="plot"
          :magnifierSize="magnifierSizePx"
          :isActive="activePlotIds.includes(plot.id)"
        ></magnifier-plots>
      </div>
    </div>
    <span>x: {{ xyValue.xV }}, y: {{ xyValue.yV }}</span>
    <magnifier-settings
      :magnifierScale="magnifierScale"
      :showSettingsDialog="showSettingsDialog"
      :setMagnifierScale="setMagnifierScale"
      :toggleSettingsDialog="toggleSettingsDialog"
      :magnifierSettingError="magnifierSettingError"
    ></magnifier-settings>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxes from './MagnifierAxes.vue'
import MagnifierPlots from './MagnifierPlots.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import { DatasetManager as DM } from '@/domains/DatasetManager'
import { AxesManager as AM } from '@/domains/AxesManager'
import { CanvasManager as CM } from '@/domains/CanvasManager'

import XYAxesCalculator from '@/domains/XYAxesCalculator'
const dm = DM.instance
const am = AM.instance
const cm = CM.instance

export default Vue.extend({
  data() {
    return {
      magnifierScale: 5,
      showSettingsDialog: false,
      magnifierSettingError: '',
      crosshairSizePx: 1,
    }
  },
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxes,
    MagnifierPlots,
    MagnifierSettings,
    MagnifierSettingsBtn,
  },
  computed: {
    // FIXME: CanvasScaleが反映されない。→Storeを導入して解決する
    canvasScale(): number {
      return cm.canvasScale
    },
    magnifierHalfSize(): number {
      return this.magnifierSizePx / 2
    },
    // INFO: 小数点ありのピクセル表示するとユーザーを混乱させるので表示上は切り上げ
    canvasCursorCeil(): {
      xPx: number
      yPx: number
    } {
      return {
        xPx: Math.ceil(this.canvasCursor.xPx),
        yPx: Math.ceil(this.canvasCursor.yPx),
      }
    },
    plots() {
      return dm.activeScaledPlots
    },
    xyValue() {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!am.validateAxes()) {
        return { xV: '0', yV: '0' }
      }
      const calculator = new XYAxesCalculator(
        {
          x1: am.axes.x1,
          x2: am.axes.x2,
          y1: am.axes.y1,
          y2: am.axes.y2,
        },
        {
          x: am.xIsLog,
          y: am.yIsLog,
        }
      )
      return calculator.calculateXYValues(
        this.canvasCursor.xPx,
        this.canvasCursor.yPx
      )
    },
  },
  props: {
    magnifierSizePx: {
      type: Number as PropType<number>,
      required: true,
    },
    uploadImageUrl: {
      type: String,
      required: true,
    },
    canvasCursor: {
      type: Object as PropType<{
        xPx: number
        yPx: number
      }>,
      required: true,
    },
    shouldShowPoints: {
      type: Boolean,
      required: true,
    },
    plotSizePx: {
      type: Number,
      required: true,
    },
    axes: {
      type: Array as PropType<
        {
          xPx: number
          yPx: number
        }[]
      >,
    },
    axesSizePx: {
      type: Number,
      required: true,
    },
    isMovingAxis: {
      type: Boolean,
      required: true,
    },
    movingAxisIndex: {
      type: Number,
      required: true,
    },
    activePlotIds: {
      type: Array as PropType<number[]>,
      required: true,
    },
  },
  methods: {
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
      this.showSettingsDialog = !this.showSettingsDialog
    },
    setMagnifierScale(inputValue: string): void {
      const scale = parseInt(inputValue)
      this.magnifierSettingError = ''
      if (scale < 2) {
        this.magnifierSettingError =
          'The Magnifier scale is supposed to be larger than 2 times.'
        this.magnifierScale = 2
        return
      }
      this.magnifierScale = scale
    },
  },
})
</script>
