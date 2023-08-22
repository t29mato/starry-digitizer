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

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDatasetStore } from '@/store/modules/dataset'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
import { useAxesStore } from '@/store/modules/axes'
import { HotTable } from '@handsontable/vue'
import 'handsontable/dist/handsontable.full.css'
import { registerAllModules } from 'handsontable/registry'
import { Plot } from '@/domains/datasetInterface'

registerAllModules()

const CSV_DELIMITER = ','
const datasetStore = useDatasetStore()
const axesStore = useAxesStore()

const hotTableSettings = ref({
  licenseKey: 'non-commercial-and-evaluation',
  columnSorting: true,
  colHeaders: ['X', 'Y'],
  columns: [
    { data: 'X', type: 'numeric' },
    { data: 'Y', type: 'numeric' },
  ],
})

const key = ref(0)
const tableRef = ref(null)

const tableData = computed(() => {
  if (datasetStore.activeDataset.value.plots.length > 0) {
    return datasetStore.activeDataset.value.plots.map((plot: Plot) => {
      const { xV, yV } = calculateXY(plot.xPx, plot.yPx)
      return {
        X: xV,
        Y: yV,
      }
    })
  }
  return [{ X: null, Y: null }]
})

function calculateXY(x: number, y: number): { xV: string; yV: string } {
  const calculator = new XYAxesCalculator(axesStore.axes.value, {
    x: axesStore.axes.value.xIsLog,
    y: axesStore.axes.value.yIsLog,
  })
  return calculator.calculateXYValues(x, y)
}

function copyData() {
  const data = tableRef.value.hotInstance.getData()
  const values = data.slice(0)
  const csv = convertToCsv(values)
  navigator.clipboard
    .writeText(csv)
    .then(() => console.log('Copy successful.'))
    .catch((err) => console.error('Copy failed.', err))
}

function convertToCsv(data: string[][]) {
  const rows = data.map((row) => row.join(CSV_DELIMITER))
  return rows.join('\n')
}

watch([tableData, axesStore.axes], () => {
  key.value++
})
</script>
