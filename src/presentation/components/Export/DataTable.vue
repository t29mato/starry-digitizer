<template>
  <div>
    <hot-table
      :data="tableData"
      :settings="hotTableSettings"
      :key="key"
      ref="tableRef"
      height="35vh"
      class="overflow-y-auto"
    ></hot-table>
    <v-btn class="mt-1" @click="copyData" size="small">Copy to Clipboard</v-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// TODO: TSの型宣言エラーが解消できずignore いずれ再度調査
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import XYAxesCalculator from '@/domain/services/XYAxesCalculator'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.css'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { registerAllModules } from 'handsontable/registry'
import { Plot } from '@/domain/datasetInterface'

import { useAxesStore } from '@/store/axes'
import { useDatasetsStore } from '@/store/datasets'
import { mapState } from 'pinia'
import { Canvas } from '@/application/services/canvas/canvas'

registerAllModules()

const CSV_DELIMITER = ','

export default defineComponent({
  components: {
    HotTable,
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useAxesStore, ['axes']),
    tableData() {
      if (this.datasets.activeDataset.plots.length > 0) {
        return this.datasets.activeDataset.plots.map((plot: Plot) => {
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
      canvas: Canvas.getInstance(),
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
      const rows = data.map((row) => row.join(CSV_DELIMITER))
      return rows.join('\n')
    },
  },
  watch: {
    tableData() {
      // @ts-ignore key is defined apparently
      this.key++
    },
    axes() {
      // @ts-ignore key is defined apparently
      this.key++
    },
  },
})
</script>
