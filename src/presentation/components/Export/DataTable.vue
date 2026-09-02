<template>
  <div>
    <hot-table
      :data="tableData"
      :settings="hotTableSettings"
      :key="key"
      ref="tableRef"
      height="30vh"
      class="overflow-y-auto"
    ></hot-table>
    <v-btn
      class="mt-1"
      @click="copyData"
      size="small"
      :disabled="datasetRepository.activeDataset.points.length === 0"
      >Copy to Clipboard</v-btn
    >
    <v-snackbar v-model="showCopySnackbar" :timeout="3000">
      {{ copySnackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// TODO: TSの型宣言エラーが解消できずignore いずれ再度調査
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { formatCoordValue } from '@/presentation/utils/formatCoordValue'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.css'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { registerAllModules } from 'handsontable/registry'
import { Point } from '@/@types/types'
import {
  canvasHandler,
  magnifier,
} from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

registerAllModules()

export default defineComponent({
  components: {
    HotTable,
  },
  data() {
    return {
      canvasHandler,
      magnifier,
      axisSetRepository,
      datasetRepository,
      key: 0,
      // INFO: kept in data() (not computed) and refreshed via explicit deep
      // watchers below. The Handsontable Vue wrapper only picks up a new
      // `data` array by reference-mutating it in place, or by remounting
      // the whole component (the `key` bump does that) - see
      // @handsontable/vue3's own `$props` watcher, which deletes `data`
      // from the settings it passes to `updateSettings` and assumes the
      // array is "synchronized by reference" instead.
      tableData: [{ X: null, Y: null }] as {
        X: string | null
        Y: string | null
      }[],
      activeColor: colors.green.lighten5,
      showCopySnackbar: false,
      copySnackbarMessage: '',
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
  created() {
    this.refreshTableData()
  },
  methods: {
    refreshTableData() {
      const points = this.datasetRepository.activeDataset.points
      this.tableData =
        points.length > 0
          ? points.map((point: Point) => {
              const { xV, yV } = this.calculateXY(point.xPx, point.yPx)
              return { X: xV, Y: yV }
            })
          : [{ X: null, Y: null }]
      this.key++
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
        this.magnifier.effectiveDigits,
      )
      const { xV, yV } = calculator.calculateXYValues(x, y)
      return {
        xV:
          xV === null
            ? 'NaN'
            : formatCoordValue(xV, calculator.xEffectiveDigits),
        yV:
          yV === null
            ? 'NaN'
            : formatCoordValue(yV, calculator.yEffectiveDigits),
      }
    },
    copyData() {
      const pointCount = this.datasetRepository.activeDataset.points.length
      if (pointCount === 0) {
        return
      }
      const data = this.tableData.map((row: any) => [row.X, row.Y])
      const csv = data.map((row: any[]) => row.join(',')).join('\n')
      navigator.clipboard
        .writeText(csv)
        .then(() => {
          this.copySnackbarMessage = `Copied ${pointCount} point${
            pointCount === 1 ? '' : 's'
          } to clipboard.`
          this.showCopySnackbar = true
        })
        .catch((err) => console.error('Failed to copy data to clipboard.', err))
    },
  },
  watch: {
    // INFO: deep-watched (rather than relying on a computed derived from
    // these) so a table refresh is triggered no matter how deeply nested
    // the change is - a new/removed point, a moved point, a dataset
    // switch, or an axis calibration edit.
    datasetRepository: {
      handler() {
        this.refreshTableData()
      },
      deep: true,
    },
    axisSetRepository: {
      handler() {
        this.refreshTableData()
      },
      deep: true,
    },
    'magnifier.effectiveDigits': {
      handler() {
        this.refreshTableData()
      },
    },
  },
})
</script>
