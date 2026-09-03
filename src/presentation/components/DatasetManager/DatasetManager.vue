<template>
  <div>
    <h4>
      Datasets
      <v-btn
        @click="handleOnClickAddDatasetButton"
        size="x-small"
        class="ml-2"
        :disabled="options.readonly"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveAllDatasetsButton"
        :disabled="options.readonly || datasetRepository.datasets.length === 0"
        class="ml-2"
        title="Remove all datasets"
        ><v-icon>mdi-delete-sweep</v-icon></v-btn
      >
      <v-btn
        v-if="datasetRepository.datasets.length > 1"
        size="x-small"
        @click="handleOnClickViewAll"
        class="ml-2"
        :color="datasetRepository.activeDatasetId === 0 ? 'primary' : ''"
        title="View all datasets"
        ><v-icon>mdi-eye-outline</v-icon></v-btn
      >
    </h4>
    <div
      class="mb-2 mt-1 pa-0"
      style="
        min-height: 15vh;
        outline: solid 1px gray;
        max-height: 30vh;
        overflow-y: auto;
      "
    >
      <!-- Individual datasets -->
      <div
        v-for="dataset in datasetRepository.datasets"
        :key="dataset.id"
        class="c__dataset-row"
      >
        <v-row class="ma-0">
          <v-col cols="8" class="pa-0">
            <v-list-item
              class="pl-2 c__dataset-item"
              link
              @click="handleOnClickDataset(dataset.id)"
              :class="
                dataset.id === datasetRepository.activeDatasetId &&
                'bg-yellow-lighten-4'
              "
            >
              <!-- INFO: when the host app supplies name candidates the field
                   becomes a combobox (suggestions + free text); otherwise it
                   stays a plain text field. -->
              <v-combobox
                v-if="options.datasetNameCandidates.length > 0"
                v-model="dataset.name"
                :items="options.datasetNameCandidates"
                :placeholder="'dataset ' + dataset.id"
                hide-details
                density="compact"
                class="mt-0 pt-0 pl-2"
                variant="underlined"
                :readonly="options.readonly"
              ></v-combobox>
              <v-text-field
                v-else
                v-model="dataset.name"
                :placeholder="'dataset ' + dataset.id"
                hide-details
                density="compact"
                type="text"
                class="mt-0 pt-0 pl-2"
                variant="underlined"
                :readonly="options.readonly"
              ></v-text-field>
            </v-list-item>
          </v-col>
          <v-col
            cols="1"
            class="pa-0 d-flex align-items-center justify-center"
            :class="`dataset-count-${dataset.id}`"
          >
            <span class="align-self-center">
              {{ dataset.points.length }}
            </span>
          </v-col>
          <v-col
            v-if="options.features.csvExport"
            cols="1"
            class="pa-0 d-flex align-items-center justify-center"
          >
            <v-btn
              size="x-small"
              icon="mdi-content-copy"
              @click="copyDatasetToClipboard(dataset.id)"
              :disabled="dataset.points.length === 0"
              variant="text"
              class="mr-1"
            ></v-btn>
          </v-col>
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
            <v-btn
              size="x-small"
              icon="mdi-eraser"
              @click="handleOnClickClearDatasetPoints(dataset.id)"
              :disabled="options.readonly || dataset.points.length === 0"
              variant="text"
              title="Clear points"
            ></v-btn>
          </v-col>
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
            <v-btn
              size="x-small"
              icon="mdi-delete"
              @click="handleOnClickRemoveDatasetButton(dataset.id)"
              :disabled="
                options.readonly || datasetRepository.datasets.length === 1
              "
              variant="text"
              title="Delete dataset"
            ></v-btn>
          </v-col>
        </v-row>
      </div>
    </div>

    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  getDatasetTableData,
  copyRowsToClipboard,
} from '@/application/utils/dataExport'
import { MASK_MODE } from '@/constants'

export default defineComponent({
  components: {},
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    return {
      ctx,
      canvasHandler: ctx.canvasHandler,
      interpolator: ctx.interpolator,
      historyManager: ctx.historyManager,
      datasetRepository: ctx.datasetRepository,
      axisSetRepository: ctx.axisSetRepository,
      options,
    }
  },
  data() {
    return {
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
    activateDataset(id: number) {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.setActiveDataset(id)
      this.axisSetRepository.setActiveAxisSet(
        this.datasetRepository.activeDataset.axisSetId,
      )
      // INFO: データセットが変えた時はマスクをクリアすることが多いので。
      this.canvasHandler.clearMask()
      this.canvasHandler.maskMode = MASK_MODE.UNSET
    },
    handleOnClickDataset(id: number) {
      if (
        id === this.datasetRepository.activeDatasetId ||
        !this.shouldContinueSwitchDataset()
      )
        return

      this.activateDataset(id)
    },
    handleOnClickViewAll() {
      if (!this.shouldContinueSwitchDataset()) return

      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.setActiveDataset(0)
      this.canvasHandler.clearMask()
      this.canvasHandler.maskMode = MASK_MODE.UNSET
    },
    handleOnClickAddDatasetButton() {
      if (!this.shouldContinueSwitchDataset()) return

      this.historyManager.capture()
      this.datasetRepository.createNewDataset()

      this.datasetRepository.lastDataset.setAxisSetId(
        this.axisSetRepository.activeAxisSetId,
      )

      this.activateDataset(this.datasetRepository.lastDatasetId)
    },
    handleOnClickRemoveDatasetButton(datasetId?: number) {
      const targetDataset = datasetId
        ? this.datasetRepository.datasets.find((d) => d.id === datasetId)
        : this.datasetRepository.activeDataset

      if (!targetDataset) return

      //NOTE: remove dataset without confirmation if the dataset doesn't have data points
      if (targetDataset.points.length === 0) {
        this.removeDataset(targetDataset.id)
        return
      }

      window.confirm(
        `Are you sure to delete '${targetDataset.name}'? This operation is irreversible.`,
      ) && this.removeDataset(targetDataset.id)
    },
    removeDataset(datasetId: number) {
      this.historyManager.capture()
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeDataset(datasetId)
    },
    handleOnClickRemoveAllDatasetsButton() {
      const totalPoints = this.datasetRepository.datasets.reduce(
        (sum, dataset) => sum + dataset.points.length,
        0,
      )

      if (totalPoints === 0) {
        this.removeAllDatasets()
        return
      }

      window.confirm(
        `Are you sure to delete all ${this.datasetRepository.datasets.length} datasets? This will remove ${totalPoints} data points. This operation is irreversible.`,
      ) && this.removeAllDatasets()
    },
    removeAllDatasets() {
      this.historyManager.capture()
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeAllDatasets()
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
      const dataset = this.datasetRepository.datasets.find(
        (d) => d.id === datasetId,
      )
      if (!dataset) return
      this.historyManager.capture()
      dataset.clearPoints()
      this.interpolator.clearPreview()
    },
  },
})
</script>
