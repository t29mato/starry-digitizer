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

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { HotTable } from '@handsontable/vue3'
import 'handsontable/dist/handsontable.full.css'

// TODO: TSの型宣言エラーが解消できずignore resolvePackageJsonExports周りが関連か。いずれ再度調査
// @ts-ignore
import { registerAllModules } from 'handsontable/registry'
import {
  canvasHandler,
  magnifier,
} from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import {
  getActiveDatasetTableData,
  copyRowsToClipboard,
} from '@/application/utils/dataExport'

registerAllModules()

export default defineComponent({
  components: {
    HotTable,
  },
  computed: {
    tableData() {
      // INFO: depends on datasetRepository/axisSetRepository (reactive
      // singletons) so this stays reactive despite reading them via the
      // shared getActiveDatasetTableData() helper rather than `this.*`
      return getActiveDatasetTableData()
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
    async copyData() {
      // INFO: passes this component's own tableData (which Handsontable
      // may have mutated via in-cell edits), not a fresh recomputation —
      // see the comment on copyRowsToClipboard in dataExport.ts.
      await copyRowsToClipboard(this.tableData)
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
