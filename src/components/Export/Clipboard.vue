<template>
  <div>
    <v-textarea
      :value="convertPlotsIntoText"
      outlined
      hide-details="true"
      @change="changeTextArea"
      height="50vh"
    ></v-textarea>
    <div class="mt-2">
      <v-btn small @click="copy" :disabled="convertPlotsIntoText.length === 0"
        >Copy to Clipboard</v-btn
      >
      <v-btn small v-if="exportBtnText" class="ml-2" @click="click">{{
        exportBtnText
      }}</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import colors from 'vuetify/lib/util/colors'
import { datasetMapper } from '@/store/modules/dataset'
import { Plots, PlotValue } from '@/domains/datasetInterface'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'

export default Vue.extend({
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
    convertPlotsIntoText(): string {
      return this.activeCalculatedPlots
        .reduce((prev, cur) => {
          return prev + `${cur.xV}, ${cur.yV}\n`
        }, '')
        .trim()
    },
    activeCalculatedPlots(): PlotValue[] {
      const newPlots = this.sortedPlots.map((plot) => {
        const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
        return {
          id: plot.id,
          xPx: plot.xPx,
          yPx: plot.yPx,
          xV,
          yV,
        }
      })
      return newPlots
    },
    sortedPlots(): Plots {
      switch (this.sortKey) {
        case 'x':
          if (this.sortOrder === 'ascending') {
            return this.datasets.activeDataset.plotsSortedByXAscending()
          } else if (this.sortOrder === 'descending') {
            return this.datasets.activeDataset.plotsSortedByXDescending()
          } else {
            throw new Error(`undefined sort order ${this.sortOrder}`)
          }
        case 'y':
          // INFO: Pixel value xy is from top left to bottom, so y is the opposite of the value you want to sort by
          if (this.sortOrder === 'ascending') {
            return this.datasets.activeDataset.plotsSortedByYDescending()
          } else if (this.sortOrder === 'descending') {
            return this.datasets.activeDataset.plotsSortedByYAscending()
          } else {
            throw new Error(`undefined sort order ${this.sortOrder}`)
          }
        case 'as added':
          if (this.sortOrder === 'ascending') {
            return this.datasets.activeDataset.plotsSortedByIdAscending()
          } else if (this.sortOrder === 'descending') {
            return this.datasets.activeDataset.plotsSortedByIdDescending()
          } else {
            throw new Error(`undefined sort order ${this.sortOrder}`)
          }
        default:
          throw new Error(`undefined sort key ${this.sortKey}`)
      }
    },
  },
  data() {
    return {
      activeColor: colors.green.lighten5,
      textArea: '',
    }
  },
  props: {
    exportBtnText: {
      type: String,
    },
    exportBtnClick: {
      type: Function,
      required: false,
    },
    sortKey: {
      type: String,
      required: true,
    },
    sortOrder: {
      type: String,
      required: false,
    },
  },
  methods: {
    copy(): void {
      navigator.clipboard.writeText(this.textArea || this.convertPlotsIntoText)
    },
    changeTextArea(text: string): void {
      this.textArea = text
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      const calculator = new XYAxesCalculator(this.axes, {
        x: this.axes.xIsLog,
        y: this.axes.yIsLog,
      })
      return calculator.calculateXYValues(x, y)
    },
    click() {
      // TODO: DatasetにCalculatedPlotsをどう入れるか検討
      this.exportBtnClick({
        canvas: this.canvas,
        datasets: this.datasets,
        axes: this.axes,
        activePlots: this.activeCalculatedPlots,
        plotsText: this.textArea,
      })
    },
  },
})
</script>
