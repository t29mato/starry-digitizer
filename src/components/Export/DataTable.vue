<template>
  <div>
    <hot-table
      :data="tabularData"
      :settings="hotTableSettings"
      :key="key"
      ref="tableRef"
      height="35vh"
      class="overflow-y-auto"
    ></hot-table>
    <v-btn class="mt-1" @click="copyData" small>Copy to Clipboard</v-btn>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import colors from 'vuetify/lib/util/colors'
import { datasetMapper } from '@/store/modules/dataset'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import { axesMapper } from '@/store/modules/axes'
import { canvasMapper } from '@/store/modules/canvas'
import { HotTable } from '@handsontable/vue'
import 'handsontable/dist/handsontable.full.css'
import { registerAllModules } from 'handsontable/registry'
registerAllModules()

export default Vue.extend({
  components: {
    HotTable,
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    ...axesMapper.mapGetters(['axes']),
    ...canvasMapper.mapGetters(['canvas']),
    tabularData() {
      if (this.datasets.activeDataset.plots.length > 0) {
        return this.datasets.activeDataset.plots.map((plot) => {
          // @ts-ignore calculateXY methods is defined apparently
          const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
          return {
            X: xV,
            Y: yV,
          }
        })
      }
      return [{ X: null, Y: null }]
    },
  },
  data() {
    return {
      key: 0,
      activeColor: colors.green.lighten5,
      hotTableSettings: {
        licenseKey: 'non-commercial-and-evaluation',
        columnSorting: true,
        colHeaders: ['X', 'Y'],
        columns: [
          { data: 'X', type: 'numeric' },
          { data: 'Y', type: 'numeric' },
        ],
      },
    }
  },
  props: {},
  methods: {
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      const calculator = new XYAxesCalculator(this.axes, {
        x: this.axes.xIsLog,
        y: this.axes.yIsLog,
      })
      return calculator.calculateXYValues(x, y)
    },
    copyData: function () {
      // @ts-ignore: there is possibility that hotInstance is not defined though
      const data = this.$refs.tableRef.hotInstance.getData()
      const values = data.slice(0)
      // @ts-ignore convertToCsv methods is defined apparently
      const csv = this.convertToCsv(values)
      navigator.clipboard
        .writeText(csv)
        .then(() => console.log('コピーが成功しました。'))
        .catch((err) => console.error('コピーが失敗しました。', err))
    },
    convertToCsv(data: string[][]) {
      console.log({ data })
      const rows = data.map((row) => row.join(','))
      return rows.join('\n')
    },
  },
  watch: {
    tabularData() {
      // @ts-ignore key property is defined apparently
      this.key++
    },
  },
})
</script>
