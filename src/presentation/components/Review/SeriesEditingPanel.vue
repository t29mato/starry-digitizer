<template>
  <div class="sd-panel mt-3">
    <h4>Series Editing</h4>
    <div
      v-if="datasetRepository.isViewAllMode"
      class="text-caption mb-2"
      style="color: #999"
    >
      Disabled in View All mode
    </div>
    <template v-else>
      <div class="d-flex align-center mb-1">
        <span class="text-caption mr-2">Select (Edit mode):</span>
        <div class="c__toggle" role="group">
          <sd-button
            v-for="shape in shapes"
            :key="shape.value"
            size="x-small"
            :color="
              canvasHandler.selectionShape === shape.value ? 'primary' : ''
            "
            :variant="
              canvasHandler.selectionShape === shape.value
                ? 'elevated'
                : 'outlined'
            "
            @click="canvasHandler.setSelectionShape(shape.value)"
            >{{ shape.label }}</sd-button
          >
        </div>
      </div>
      <div class="text-caption mb-1">{{ selectionText }}</div>
      <div class="d-flex flex-wrap mb-2 c__buttons">
        <sd-menu :items="moveItems">
          <template #activator="{ props }">
            <sd-button
              size="small"
              :disabled="!canEdit || selectedIds.length === 0 || !hasOthers"
              v-bind="props"
              >Move to…</sd-button
            >
          </template>
        </sd-menu>
        <sd-button
          size="small"
          :disabled="!canEdit || selectedIds.length === 0"
          @click="splitSelected"
          >New series</sd-button
        >
        <sd-menu :items="mergeItems">
          <template #activator="{ props }">
            <sd-button
              size="small"
              :disabled="!canEdit || !hasOthers"
              v-bind="props"
              >Merge into…</sd-button
            >
          </template>
        </sd-menu>
      </div>
      <div class="d-flex align-end">
        <sd-text-field
          class="mr-2"
          prefix="Within:"
          suffix="px"
          type="number"
          min="0"
          step="0.5"
          :model-value="duplicateDistancePx"
          :disabled="!canEdit"
          @update:model-value="onDistanceInput"
        ></sd-text-field>
        <sd-button size="small" :disabled="!canEdit" @click="mergeDuplicates"
          >Merge duplicates</sd-button
        >
      </div>
      <div v-if="message" class="text-caption mt-1">{{ message }}</div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  SdButton,
  SdMenu,
  SdTextField,
  type SdMenuItem,
} from '@/presentation/ui'
import { SelectionShape } from '@/@types/types'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'
import {
  mergeActiveDatasetInto,
  mergeDuplicatePoints,
  moveSelectedPointsTo,
  splitSelectedPoints,
} from '@/application/utils/reviewEditOperations'

// INFO: Series editing for reviewing auto-extracted data (docs/design/
// auto-extraction-review-design.md, "3."): fix an LLM splitting one series
// into several, a detector mixing series up or emitting duplicate points.
// Every operation is a use case that captures history first, so it is
// undoable and appears in the edit log's events; the edit log's counts come
// from the state diff.
export default defineComponent({
  components: { SdButton, SdMenu, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { canvasHandler, datasetRepository } = ctx
    return { ctx, options, canvasHandler, datasetRepository }
  },
  data() {
    return {
      shapes: [
        { label: 'Box', value: 'box' },
        { label: 'Lasso', value: 'lasso' },
      ] as { label: string; value: SelectionShape }[],
      duplicateDistancePx: 3,
      message: '',
    }
  },
  computed: {
    canEdit(): boolean {
      return !this.options.readonly
    },
    activeDataset(): DatasetInterface {
      return this.datasetRepository.activeDataset
    },
    selectedIds(): number[] {
      return this.activeDataset.activePointIds
    },
    selectionText(): string {
      return `${this.selectedIds.length} point(s) selected (⌘/Ctrl+drag adds)`
    },
    otherDatasets(): DatasetInterface[] {
      return this.datasetRepository.datasets.filter(
        (d) => d.id !== this.activeDataset.id,
      )
    },
    hasOthers(): boolean {
      return this.otherDatasets.length > 0
    },
    moveItems(): SdMenuItem[] {
      return this.otherDatasets.map((dataset) => ({
        text: dataset.name,
        action: () => this.moveSelectedTo(dataset.id),
      }))
    },
    mergeItems(): SdMenuItem[] {
      return this.otherDatasets.map((dataset) => ({
        text: dataset.name,
        action: () => this.mergeActiveInto(dataset.id),
      }))
    },
  },
  methods: {
    onDistanceInput(value: string | number) {
      const parsed = parseFloat(String(value))
      if (!Number.isNaN(parsed)) this.duplicateDistancePx = parsed
    },
    moveSelectedTo(datasetId: number) {
      const count = moveSelectedPointsTo(this.ctx, datasetId)
      this.message = `Moved ${count} point(s).`
    },
    splitSelected() {
      const count = this.selectedIds.length
      const id = splitSelectedPoints(this.ctx)
      if (id === null) return
      const created = this.datasetRepository.datasets.find((d) => d.id === id)
      this.message = `Moved ${count} point(s) to "${created?.name}".`
    },
    mergeActiveInto(datasetId: number) {
      const name = this.activeDataset.name
      mergeActiveDatasetInto(this.ctx, datasetId)
      this.message = `Merged "${name}" into "${this.activeDataset.name}".`
    },
    mergeDuplicates() {
      const removed = mergeDuplicatePoints(this.ctx, this.duplicateDistancePx)
      this.message = removed
        ? `Merged away ${removed} duplicate point(s).`
        : 'No duplicates found.'
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__buttons {
    gap: 4px;
  }
  &__toggle {
    display: inline-flex;
    :deep(.sd-btn) {
      border-radius: 0;
      &:first-child {
        border-top-left-radius: var(--sd-radius, 4px);
        border-bottom-left-radius: var(--sd-radius, 4px);
      }
      &:last-child {
        border-top-right-radius: var(--sd-radius, 4px);
        border-bottom-right-radius: var(--sd-radius, 4px);
      }
      & + .sd-btn {
        margin-left: -1px;
      }
    }
  }
}
</style>
