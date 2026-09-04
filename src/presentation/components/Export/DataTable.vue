<template>
  <div>
    <!-- INFO: `data-table-wrapper` marks the scrolling frame (this is what a
         host measures for height); `data-table` marks the <table> itself. -->
    <div class="c__table-wrapper" data-cy="data-table-wrapper">
      <table class="sd-table" data-cy="data-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column"
              class="c__sortable"
              @click="toggleSort(column)"
            >
              {{ column
              }}<span v-if="sortColumn === column" class="c__sort-indicator">{{
                sortAscending ? '▲' : '▼'
              }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in sortedRows" :key="index">
            <td v-for="column in columns" :key="column">
              {{ formatCell(row[column]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="c__footer mt-1">
      <sd-button
        v-if="options.features.csvExport"
        @click="copyData"
        size="small"
        >Copy to Clipboard</sd-button
      >
      <!-- INFO: "Effective digits" used to be a magnifier setting, but it
           rounds every extracted value the library hands out — these cells,
           the CSV above, and getDatasetValues() / the `change` event. It sits
           next to the table because that is the output it visibly governs:
           typing a new value re-renders the cells immediately.
           This panel is hidden by `features.dataTable: false`, so it cannot
           be the only way to reach the setting — a host that hides it uses
           the `effectiveDigits` prop instead (which also overrides this
           field). -->
      <div class="c__digits">
        <sd-text-field
          class="c__digits-field"
          :model-value="valueFormat.effectiveDigits"
          type="number"
          :min="minEffectiveDigits"
          :max="maxEffectiveDigits"
          label="Effective digits"
          data-cy="effective-digits"
          @change="onChangeEffectiveDigits"
        ></sd-text-field>
        <p v-if="effectiveDigitsError" class="c__error text-caption text-red">
          {{ effectiveDigitsError }}
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { SdButton, SdTextField } from '@/presentation/ui'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  getActiveDatasetTableData,
  copyRowsToClipboard,
  TableRow,
} from '@/application/utils/dataExport'
import {
  MAX_EFFECTIVE_DIGITS,
  MIN_EFFECTIVE_DIGITS,
  isValidEffectiveDigits,
} from '@/application/services/valueFormat/valueFormat'

type Column = 'X' | 'Y'

export default defineComponent({
  components: { SdButton, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return { ctx, valueFormat: ctx.valueFormat, options }
  },
  data() {
    return {
      columns: ['X', 'Y'] as Column[],
      effectiveDigitsError: '',
      minEffectiveDigits: MIN_EFFECTIVE_DIGITS,
      maxEffectiveDigits: MAX_EFFECTIVE_DIGITS,
      // INFO: sorting is a view-only concern — it never touches the dataset,
      // so `sortedRows` always sorts a copy of `tableData`.
      sortColumn: null as Column | null,
      sortAscending: true,
    }
  },
  computed: {
    tableData(): TableRow[] {
      // INFO: the context is reactive(), so reading it inside this computed
      // keeps the dependency tracking even though the values are pulled via
      // the shared getActiveDatasetTableData() helper rather than `this.*`
      return getActiveDatasetTableData(this.ctx)
    },
    sortedRows(): TableRow[] {
      if (!this.sortColumn) return this.tableData

      const column = this.sortColumn
      const direction = this.sortAscending ? 1 : -1
      return [...this.tableData].sort((a, b) => {
        const left = Number(a[column])
        const right = Number(b[column])
        // INFO: empty / NaN cells always sink to the bottom, whatever the
        // direction, so a partially calibrated dataset stays readable.
        const leftInvalid = a[column] === null || Number.isNaN(left)
        const rightInvalid = b[column] === null || Number.isNaN(right)
        if (leftInvalid || rightInvalid) {
          return Number(leftInvalid) - Number(rightInvalid)
        }
        return (left - right) * direction
      })
    },
  },
  methods: {
    toggleSort(column: Column) {
      if (this.sortColumn === column) {
        this.sortAscending = !this.sortAscending
        return
      }
      this.sortColumn = column
      this.sortAscending = true
    },
    formatCell(value: string | null): string {
      if (value === null) return ''
      // INFO: dataExport hands over exponential strings ("5e+0"); render them
      // the way a spreadsheet would ("5") while leaving "NaN" alone.
      const parsed = Number(value)
      return Number.isNaN(parsed) ? value : String(parsed)
    },
    onChangeEffectiveDigits(event: Event) {
      const digits = parseInt((<HTMLInputElement>event.target).value)
      this.effectiveDigitsError = ''
      // INFO: the service throws on an out-of-range value; check first so the
      // user gets the inline message they always got instead of an exception.
      if (!isValidEffectiveDigits(digits)) {
        this.effectiveDigitsError = `Value must be between ${MIN_EFFECTIVE_DIGITS} and ${MAX_EFFECTIVE_DIGITS}`
        return
      }
      this.valueFormat.setEffectiveDigits(digits)
    },
    async copyData() {
      // INFO: copies exactly what the user sees, i.e. in the displayed sort
      // order.
      await copyRowsToClipboard(this.sortedRows)
    },
  },
})
</script>

<style scoped lang="scss">
.c__table-wrapper {
  display: inline-block;
  max-width: 100%;
  max-height: var(--sd-table-max-height, 30vh);
  overflow: auto;
}

.sd-table {
  border-collapse: collapse;
  font-size: 0.75rem;

  th,
  td {
    min-width: 50px;
    padding: 3px 6px;
    border: 1px solid var(--sd-border, rgba(0, 0, 0, 0.24));
    text-align: right;
    white-space: nowrap;
  }
  td:empty::after {
    content: '\00a0';
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--sd-surface-variant, #f5f5f5);
    text-align: center;
    font-weight: 600;
  }
}

.c__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.c__digits-field {
  // INFO: the left sidebar is 260px wide at its narrowest; keep the number
  // field from eating the row the Copy button shares with it.
  max-width: 110px;
}

.c__error {
  margin: 2px 0 0;
}

.c__sortable {
  cursor: pointer;
  user-select: none;
}

.c__sort-indicator {
  margin-left: 2px;
  font-size: 0.625rem;
}
</style>
