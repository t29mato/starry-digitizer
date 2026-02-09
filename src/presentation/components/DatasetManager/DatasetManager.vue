<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="handleOnClickAddDatasetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveAllDatasetsButton"
        :disabled="datasetRepository.datasets.length === 0"
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
              <v-text-field
                v-model="dataset.name"
                :placeholder="'dataset ' + dataset.id"
                hide-details
                density="compact"
                type="text"
                class="mt-0 pt-0 pl-2"
                variant="underlined"
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
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
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
              :disabled="dataset.points.length === 0"
              variant="text"
              title="Clear points"
            ></v-btn>
          </v-col>
          <v-col cols="1" class="pa-0 d-flex align-items-center justify-center">
            <v-btn
              size="x-small"
              icon="mdi-delete"
              @click="handleOnClickRemoveDatasetButton(dataset.id)"
              :disabled="datasetRepository.datasets.length === 1"
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

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { MASK_MODE } from '@/constants'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { Point } from '@/@types/types'

export default defineComponent({
  components: {},
  data() {
    return {
      canvasHandler,
      interpolator,
      datasetRepository,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
      axisSetRepository,
    }
  },
  props: {
    exportBtnText: {
      type: String,
      required: false,
    },
    exportBtnClick: {
      type: Function,
      required: false,
    },
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
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeAllDatasets()
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      const calculator = new AxisSetCalculator(
        this.axisSetRepository.activeAxisSet,
        {
          x: this.axisSetRepository.activeAxisSet.xIsLogScale,
          y: this.axisSetRepository.activeAxisSet.yIsLogScale,
        },
      )
      return calculator.calculateXYValues(x, y)
    },
    convertToCsv(data: string[][]): string {
      const CSV_DELIMITER = ','
      const rows = data.map((row) => row.join(CSV_DELIMITER))
      return rows.join('\n')
    },
    copyDatasetToClipboard(datasetId: number) {
      const dataset = this.datasetRepository.datasets.find(
        (d) => d.id === datasetId,
      )
      if (!dataset || dataset.points.length === 0) return

      const data = dataset.points.map((point: Point) => {
        const { xV, yV } = this.calculateXY(point.xPx, point.yPx)
        return [xV, yV]
      })

      const csv = this.convertToCsv(data)
      navigator.clipboard
        .writeText(csv)
        .then(() => console.log('Dataset copied to clipboard successfully.'))
        .catch((err) =>
          console.error('Failed to copy dataset to clipboard.', err),
        )
    },
    handleOnClickClearDatasetPoints(datasetId: number) {
      const dataset = this.datasetRepository.datasets.find(
        (d) => d.id === datasetId,
      )
      if (!dataset) return
      dataset.clearPoints()
      this.interpolator.clearPreview()
    },
  },
})
</script>
