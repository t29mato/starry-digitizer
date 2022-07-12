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
      <magnifier-image
        :src="uploadImageUrl"
        :scale="magnifierScale"
        :cursorX="canvasCursor.xPx / canvasScale"
        :cursorY="canvasCursor.yPx / canvasScale"
        :size="magnifierSizePx"
      ></magnifier-image>
      <magnifier-vertical-line
        :magnifierSize="magnifierSizePx"
      ></magnifier-vertical-line>
      <magnifier-horizontal-line
        :magnifierSize="magnifierSizePx"
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
          :isFit="isFit"
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
          :isActive="isMovingPlot && movingPlotId === plot.id"
          :isFit="isFit"
        ></magnifier-plots>
      </div>
    </div>
    <p>x: {{ xyValue.xV }}, y: {{ xyValue.yV }}</p>
    <!-- <v-simple-table dense>
      <thead>
        <tr>
          <th></th>
          <th>Pixel</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>X</th>
          <td>{{ canvasCursorCeil.xPx }}</td>
          <td>
            {{ xyValue.xV }}
          </td>
        </tr>
        <tr>
          <th>Y</th>
          <td>
            {{ canvasCursorCeil.yPx }}
          </td>
          <td>
            {{ xyValue.yV }}
          </td>
        </tr>
      </tbody>
    </v-simple-table> -->
    <v-slider
      v-model="magnifierScale"
      thumb-label="always"
      max="10"
      min="2"
      label="Magnifier"
      thumb-size="20"
    ></v-slider>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import MagnifierVerticalLine from './MagnifierVerticalLine.vue'
import MagnifierHorizontalLine from './MagnifierHorizontalLine.vue'
import MagnifierImage from './MagnifierImage.vue'
import MagnifierAxes from './MagnifierAxes.vue'
import MagnifierPlots from './MagnifierPlots.vue'

export default Vue.extend({
  data() {
    return {
      magnifierScale: 5,
    }
  },
  components: {
    MagnifierVerticalLine,
    MagnifierHorizontalLine,
    MagnifierImage,
    MagnifierAxes,
    MagnifierPlots,
  },
  computed: {
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
    canvasScale: {
      type: Number,
      required: true,
    },
    plots: {
      type: Array as PropType<{ id: number; xPx: number; yPx: number }[]>,
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
    isMovingPlot: {
      type: Boolean,
      required: true,
    },
    movingPlotId: {
      type: Number,
      required: true,
    },
    xyValue: {
      type: Object as PropType<{ xV: number; yV: number }>,
    },
    isFit: {
      type: Boolean,
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
  },
})
</script>
