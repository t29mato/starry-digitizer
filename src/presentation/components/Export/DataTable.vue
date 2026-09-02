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

// TODO: Ignoring because the TS type declaration error couldn't be resolved; investigate again later
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'

// TODO: Ignoring because the TS type declaration error couldn't be resolved; may be related to resolvePackageJsonExports. Investigate again later
// @ts-ignore
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.css'

// TODO: Ignoring because the TS type declaration error couldn't be resolved; may be related to resolvePackageJsonExports. Investigate again later
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
      magnifier,
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
      // INFO: If the axis values aren't determined yet, show the pixel values as-is
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
        this.magnifier.effectiveDigits,
      )
      return calculator.calculateXYValues(x, y)
    },
    copyData() {
      const data = this.tableData.map((row: any) => [row.X, row.Y])
      const csv = data.map((row: any[]) => row.join(',')).join('\n')
      navigator.clipboard
        .writeText(csv)
        .then(() => console.log('Data copied to clipboard successfully.'))
        .catch((err) => console.error('Failed to copy data to clipboard.', err))
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
