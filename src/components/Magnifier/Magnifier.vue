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
      <div v-for="(axis, index) in scaledAxes" :key="index">
        <magnifier-axis
          :axis="axis"
          :isActive="isMovingAxis && axes.activeIndex === index"
          :index="index"
          :canvasScale="canvasScale"
          :canvasCursor="canvasCursor"
          :magnifierScale="magnifierScale"
          :magnifierSize="magnifierSizePx"
          :label="showAxisName(index)"
        ></magnifier-axis>
      </div>
      <div
        v-for="plot in activeScaledPlots"
        v-show="shouldShowPoints"
        :key="plot.id"
      >
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
import MagnifierAxis from './MagnifierAxis.vue'
import MagnifierPlots from './MagnifierPlots.vue'
import MagnifierSettings from './MagnifierSettings.vue'
import MagnifierSettingsBtn from './MagnifierSettingsBtn.vue'
import { datasetMapper } from '@/store/modules/dataset'
import { canvasMapper } from '@/store/modules/canvas'
import { magnifierMapper } from '@/store/modules/magnifier'
import { axesMapper } from '@/store/modules/axes'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import { Axes } from '@/domains/axes'
const ad = Axes.instance

export default Vue.extend({
  data() {
    return {}
  },
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxis,
    MagnifierPlots,
    MagnifierSettings,
    MagnifierSettingsBtn,
  },
  computed: {
    ...datasetMapper.mapGetters(['activeScaledPlots']),
    ...canvasMapper.mapGetters(['canvasScale']),
    ...magnifierMapper.mapGetters([
      'magnifierScale',
      'showSettingsDialog',
      'magnifierSettingError',
      'crosshairSizePx',
      'magnifierSizePx',
    ]),
    ...axesMapper.mapGetters(['axes']),
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
    scaledAxes() {
      return ad.scaledAxes(this.canvasScale)
    },
    xyValue(): {
      xV: string
      yV: string
    } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!ad.validateAxes()) {
        return { xV: '0', yV: '0' }
      }
      const calculator = new XYAxesCalculator(
        {
          x1: ad.x1,
          x2: ad.x2,
          y1: ad.y1,
          y2: ad.y2,
        },
        {
          x: ad.xIsLog,
          y: ad.yIsLog,
        }
      )
      return calculator.calculateXYValues(
        this.canvasCursor.xPx,
        this.canvasCursor.yPx
      )
    },
  },
  props: {
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
    // axes: {
    //   type: Array as PropType<
    //     {
    //       xPx: number
    //       yPx: number
    //     }[]
    //   >,
    // },
    isMovingAxis: {
      type: Boolean,
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
