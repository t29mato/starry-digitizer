<template>
  <div>
    <h4>
      Datasets
      <sd-button
        @click="handleOnClickAddDatasetButton"
        size="x-small"
        class="ml-2"
        :icon="mdiPlus"
        title="Add dataset"
        data-cy="add-dataset"
        :disabled="options.readonly"
      />
      <sd-button
        size="x-small"
        @click="handleOnClickRemoveAllDatasetsButton"
        :icon="mdiDeleteSweep"
        :disabled="options.readonly || datasetRepository.datasets.length === 0"
        class="ml-2"
        title="Remove all datasets"
        data-cy="remove-all-datasets"
      />
      <sd-button
        v-if="datasetRepository.datasets.length > 1"
        size="x-small"
        @click="handleOnClickViewAll"
        class="ml-2"
        :icon="mdiEyeOutline"
        :color="datasetRepository.activeDatasetId === 0 ? 'primary' : ''"
        title="View all datasets"
        data-cy="view-all-datasets"
      />
    </h4>
    <div class="mb-2 mt-1 pa-0 c__dataset-list">
      <!-- Individual datasets -->
      <div
        v-for="dataset in datasetRepository.datasets"
        :key="dataset.id"
        class="c__dataset-row"
      >
        <div class="sd-row ma-0">
          <div class="sd-col-8 pa-0">
            <div
              class="pl-2 c__dataset-item"
              @click="handleOnClickDataset(dataset.id)"
              :class="
                dataset.id === datasetRepository.activeDatasetId &&
                'bg-yellow-lighten-4'
              "
            >
              <!-- INFO: when the host app supplies name candidates the field
                   becomes a combobox (suggestions + free text); otherwise it
                   stays a plain text field. -->
              <sd-combobox
                v-if="options.datasetNameCandidates.length > 0"
                v-model="dataset.name"
                :items="options.datasetNameCandidates"
                :placeholder="'dataset ' + dataset.id"
                class="pl-2"
                variant="underlined"
                :readonly="options.readonly"
              />
              <sd-text-field
                v-else
                v-model="dataset.name"
                :placeholder="'dataset ' + dataset.id"
                type="text"
                class="pl-2"
                variant="underlined"
                :readonly="options.readonly"
              />
            </div>
          </div>
          <div
            class="sd-col-1 pa-0 d-flex align-items-center justify-center"
            :class="`dataset-count-${dataset.id}`"
          >
            <span class="align-self-center">
              {{ dataset.points.length }}
            </span>
          </div>
          <div
            v-if="options.features.csvExport"
            class="sd-col-1 pa-0 d-flex align-items-center justify-center"
          >
            <sd-button
              size="x-small"
              :icon="mdiContentCopy"
              @click="copyDatasetToClipboard(dataset.id)"
              :disabled="dataset.points.length === 0"
              variant="text"
              class="mr-1"
              title="Copy dataset to clipboard"
              data-cy="dataset-copy"
            />
          </div>
          <div class="sd-col-1 pa-0 d-flex align-items-center justify-center">
            <sd-button
              size="x-small"
              :icon="mdiEraser"
              @click="handleOnClickClearDatasetPoints(dataset.id)"
              :disabled="options.readonly || dataset.points.length === 0"
              variant="text"
              title="Clear points"
              data-cy="dataset-clear"
            />
          </div>
          <div class="sd-col-1 pa-0 d-flex align-items-center justify-center">
            <sd-button
              size="x-small"
              :icon="mdiDelete"
              @click="handleOnClickRemoveDatasetButton(dataset.id)"
              :disabled="
                options.readonly || datasetRepository.datasets.length === 1
              "
              variant="text"
              title="Delete dataset"
              data-cy="dataset-delete"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  mdiPlus,
  mdiDeleteSweep,
  mdiEyeOutline,
  mdiContentCopy,
  mdiEraser,
  mdiDelete,
} from '@mdi/js'

import { SdButton, SdCombobox, SdTextField } from '@/presentation/ui'
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  getDatasetTableData,
  copyRowsToClipboard,
} from '@/application/utils/dataExport'
// INFO: the dataset-list use cases live in the application layer so a host
// that replaces this panel gets the same behaviour (call order, undo capture,
// mask/axis-set clean-up) without reimplementing it. This component only
// decides whether to ask the user first.
import {
  activateDataset,
  addDataset,
  clearDatasetPoints,
  removeAllDatasets,
  removeDataset,
  viewAllDatasets,
} from '@/application/utils/datasetOperations'

export default defineComponent({
  components: { SdButton, SdCombobox, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return {
      ctx,
      datasetRepository: ctx.datasetRepository,
      options,
    }
  },
  data() {
    return {
      mdiPlus,
      mdiDeleteSweep,
      mdiEyeOutline,
      mdiContentCopy,
      mdiEraser,
      mdiDelete,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
    }
  },
  computed: {
    totalPointsCount(): number {
      return this.datasetRepository.datasets.reduce(
        (sum, dataset) => sum + dataset.points.length,
        0,
      )
    },
  },
  methods: {
    shouldContinueSwitchDataset(): boolean {
      if (this.datasetRepository.activeDataset.tempPoints.length === 0)
        return true

      return window.confirm(
        'There are unconfirmed interpolated points. Do you want to discard them and switch to a different dataset?',
      )
    },
    handleOnClickDataset(id: number) {
      if (
        id === this.datasetRepository.activeDatasetId ||
        !this.shouldContinueSwitchDataset()
      )
        return

      activateDataset(this.ctx, id)
    },
    handleOnClickViewAll() {
      if (!this.shouldContinueSwitchDataset()) return

      viewAllDatasets(this.ctx)
    },
    handleOnClickAddDatasetButton() {
      if (!this.shouldContinueSwitchDataset()) return

      addDataset(this.ctx)
    },
    handleOnClickRemoveDatasetButton(datasetId?: number) {
      const targetDataset = datasetId
        ? this.datasetRepository.datasets.find((d) => d.id === datasetId)
        : this.datasetRepository.activeDataset

      if (!targetDataset) return

      //NOTE: remove dataset without confirmation if the dataset doesn't have data points
      if (targetDataset.points.length === 0) {
        removeDataset(this.ctx, targetDataset.id)
        return
      }

      window.confirm(
        `Are you sure to delete '${targetDataset.name}'? This operation is irreversible.`,
      ) && removeDataset(this.ctx, targetDataset.id)
    },
    handleOnClickRemoveAllDatasetsButton() {
      const totalPoints = this.totalPointsCount

      if (totalPoints === 0) {
        removeAllDatasets(this.ctx)
        return
      }

      window.confirm(
        `Are you sure to delete all ${this.datasetRepository.datasets.length} datasets? This will remove ${totalPoints} data points. This operation is irreversible.`,
      ) && removeAllDatasets(this.ctx)
    },
    async copyDatasetToClipboard(datasetId: number) {
      const dataset = this.datasetRepository.datasets.find(
        (d) => d.id === datasetId,
      )
      if (!dataset || dataset.points.length === 0) return

      // INFO: getDatasetTableData() calibrates with the dataset's own axis
      // set, so a row copied here matches the dataset even when another
      // axis set is currently active.
      await copyRowsToClipboard(getDatasetTableData(this.ctx, dataset))
    },
    handleOnClickClearDatasetPoints(datasetId: number) {
      clearDatasetPoints(this.ctx, datasetId)
    },
  },
})
</script>

<style scoped lang="scss">
// INFO: heights are custom properties so a host can compact the sidebar
// without overriding internal class names.
.c__dataset-list {
  min-height: var(--sd-dataset-list-min-height, 15vh);
  max-height: var(--sd-dataset-list-max-height, 30vh);
  overflow-y: auto;
  outline: solid 1px gray;
}

// INFO: replaces <v-list-item link>: the name cell is a plain clickable row.
// The hover rule skips the active row so its yellow highlight stays visible.
.c__dataset-item {
  cursor: pointer;
  padding-top: 2px;
  padding-bottom: 2px;

  &:hover:not(.bg-yellow-lighten-4) {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
