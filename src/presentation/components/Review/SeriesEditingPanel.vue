<template>
  <div class="mt-3">
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
        <v-btn-toggle
          :model-value="canvasHandler.selectionShape"
          @update:model-value="canvasHandler.setSelectionShape($event)"
          density="compact"
          divided
          :border="true"
          mandatory
        >
          <v-btn value="box" size="x-small">Box</v-btn>
          <v-btn value="lasso" size="x-small">Lasso</v-btn>
        </v-btn-toggle>
      </div>
      <div class="text-caption mb-1">
        {{ selectedIds.length }} point(s) selected
        <span class="text-medium-emphasis">(⌘/Ctrl+drag adds)</span>
      </div>
      <div class="d-flex flex-wrap mb-2" style="gap: 4px">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              size="small"
              :disabled="selectedIds.length === 0 || otherDatasets.length === 0"
              >Move to…</v-btn
            >
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="dataset in otherDatasets"
              :key="dataset.id"
              @click="moveSelectedTo(dataset.id)"
              >{{ dataset.name }}</v-list-item
            >
          </v-list>
        </v-menu>
        <v-btn
          size="small"
          :disabled="selectedIds.length === 0"
          @click="splitSelected"
          >New series</v-btn
        >
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              size="small"
              :disabled="otherDatasets.length === 0"
              >Merge into…</v-btn
            >
          </template>
          <v-list density="compact">
            <v-list-subheader
              >Merge "{{ activeDataset.name }}" into</v-list-subheader
            >
            <v-list-item
              v-for="dataset in otherDatasets"
              :key="dataset.id"
              @click="mergeActiveInto(dataset.id)"
              >{{ dataset.name }}</v-list-item
            >
          </v-list>
        </v-menu>
      </div>
      <div class="d-flex align-end">
        <v-text-field
          v-model.number="duplicateDistancePx"
          prefix="Within: "
          suffix="px"
          type="number"
          min="0"
          step="0.5"
          density="compact"
          hide-details
          class="mr-2"
        ></v-text-field>
        <v-btn size="small" @click="mergeDuplicates">Merge duplicates</v-btn>
      </div>
      <div v-if="message" class="text-caption mt-1">{{ message }}</div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  canvasHandler,
  historyManager,
  interpolator,
} from '@/instanceStore/applicationServiceInstances'
import {
  axisSetRepository,
  datasetRepository,
} from '@/instanceStore/repositoryInatances'
import { DatasetInterface } from '@/domain/models/dataset/datasetInterface'

// INFO: Series editing for reviewing auto-extracted data (docs/design/
// auto-extraction-review-design.md, "3."): fix an LLM splitting one series
// into several, a detector mixing series up or emitting duplicate points.
// Every operation captures history first, so it is undoable and appears in
// the edit log's events; the edit log's counts come from the state diff.
export default defineComponent({
  data() {
    return {
      canvasHandler,
      historyManager,
      interpolator,
      axisSetRepository,
      datasetRepository,
      duplicateDistancePx: 3,
      message: '',
    }
  },
  computed: {
    activeDataset(): DatasetInterface {
      return this.datasetRepository.activeDataset
    },
    selectedIds(): number[] {
      return this.activeDataset.activePointIds
    },
    otherDatasets(): DatasetInterface[] {
      return this.datasetRepository.datasets.filter(
        (d) => d.id !== this.activeDataset.id,
      )
    },
  },
  methods: {
    beforeEdit(action: string) {
      this.historyManager.capture(action)
      this.interpolator.isActive && this.interpolator.clearPreview()
    },
    moveSelectedTo(datasetId: number) {
      const count = this.selectedIds.length
      this.beforeEdit('points.move-to-series')
      this.datasetRepository.movePoints(
        this.activeDataset.id,
        [...this.selectedIds],
        datasetId,
      )
      this.message = `Moved ${count} point(s).`
    },
    splitSelected() {
      const count = this.selectedIds.length
      this.beforeEdit('points.split-to-new-series')
      const id = this.datasetRepository.splitPointsToNewDataset(
        this.activeDataset.id,
        [...this.selectedIds],
      )
      const created = this.datasetRepository.datasets.find((d) => d.id === id)
      this.message = `Moved ${count} point(s) to "${created?.name}".`
    },
    mergeActiveInto(datasetId: number) {
      const name = this.activeDataset.name
      this.beforeEdit('series.merge')
      this.datasetRepository.mergeDatasets(this.activeDataset.id, datasetId)
      // INFO: the merged-away dataset was active; follow it to the target
      this.axisSetRepository.setActiveAxisSet(this.activeDataset.axisSetId)
      this.message = `Merged "${name}" into "${this.activeDataset.name}".`
    },
    mergeDuplicates() {
      const distance = Number(this.duplicateDistancePx)
      if (!(distance >= 0)) return
      this.beforeEdit('points.merge-duplicates')
      const removed = this.activeDataset.mergeDuplicatePoints(distance)
      this.message = removed
        ? `Merged away ${removed} duplicate point(s).`
        : 'No duplicates found.'
    },
  },
})
</script>
