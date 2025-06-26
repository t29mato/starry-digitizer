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
    <v-btn class="mt-1" @click="copyData" size="small">Copy to Clipboard</v-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

// TODO: TSの型宣言エラーが解消できずignore いずれ再度調査
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.css'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { registerAllModules } from 'handsontable/registry'
import { Point } from '@/@types/types'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

registerAllModules()

export default defineComponent({
  components: {
    HotTable,
  },
  computed: {
    tableData() {
      if (this.datasetRepository.activeDataset.points.length > 0) {
        return this.datasetRepository.activeDataset.points.map(
          (point: Point) => {
            // @ts-ignore calculateXY methods is defined apparently
            const { xV, yV } = this.calculateXY(point.xPx, point.yPx)
            return {
              X: xV,
              Y: yV,
            }
          },
        )
      }
      return [{ X: null, Y: null }]
    },
  },
  data() {
    return {
      canvasHandler,
      axisSetRepository,
      datasetRepository,
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
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
      )
      return calculator.calculateXYValues(x, y)
    },
  },
  watch: {
    tableData() {
      // @ts-ignore key is defined apparently
      this.key++
    },
    axisSet() {
      // @ts-ignore key is defined apparently
      this.key++
    },
  },
})
</script>
@/domain/services/axisSetCalculator @/domain/services/axisSetCalculator
