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
      v-if="options.features.csvExport"
      class="mt-1"
      @click="copyData"
      size="small"
      >Copy to Clipboard</v-btn
    >
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
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  getActiveDatasetTableData,
  copyRowsToClipboard,
} from '@/application/utils/dataExport'

registerAllModules()

export default defineComponent({
  components: {
    HotTable,
  },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, options }
  },
  computed: {
    tableData() {
      // INFO: the context is reactive(), so reading it inside this computed
      // keeps the dependency tracking even though the values are pulled via
      // the shared getActiveDatasetTableData() helper rather than `this.*`
      return getActiveDatasetTableData(this.ctx)
    },
    hotTableSettings() {
      return {
        licenseKey: 'non-commercial-and-evaluation',
        columnSorting: true,
        colHeaders: ['X', 'Y'],
        // INFO: read-only mode must also block in-cell edits of the table.
        readOnly: this.options.readonly,
        columns: [
          { data: 'X', type: 'numeric' },
          { data: 'Y', type: 'numeric' },
        ],
      }
    },
  },
  data() {
    return {
      key: 0,
      activeColor: colors.green.lighten5,
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
