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

    <confirm-dialog
      v-model="confirmDialogShow"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-color="confirmDialog.confirmColor"
      @confirm="handleConfirmDialogConfirm"
    ></confirm-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import {
  canvasHandler,
  interpolator,
  magnifier,
  historyManager,
} from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { MASK_MODE } from '@/constants'
import AxisSetCalculator from '@/domain/services/axisSetCalculator'
import { Point } from '@/@types/types'
import ConfirmDialog from '@/presentation/components/Generals/ConfirmDialog.vue'

export default defineComponent({
  components: {
    ConfirmDialog,
  },
  data() {
    return {
      canvasHandler,
      interpolator,
      magnifier,
      historyManager,
      datasetRepository,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
      axisSetRepository,
      // INFO: replaces window.confirm() (#270) — a single pending
      // confirmation shared by every destructive/disruptive action in this
      // component, since only one can be shown at a time anyway.
      // NOTE: `show` is kept as its own top-level field (rather than nested
      // inside confirmDialog) — vue-tsc can't type-check a v-model bound to
      // a nested property of the same object that other props on the same
      // tag are also read from.
      confirmDialogShow: false,
      confirmDialog: {
        title: 'Confirm',
        message: '',
        confirmColor: 'primary',
        onConfirm: null as (() => void) | null,
      },
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
    // INFO: replaces window.confirm() (#270). Runs `proceed` immediately
    // when there is nothing to lose, otherwise defers it to the Confirm
    // button's click via confirmDialog.onConfirm.
    openConfirmDialog(
      message: string,
      onConfirm: () => void,
      options: { title?: string; confirmColor?: string } = {},
    ) {
      this.confirmDialog = {
        title: options.title ?? 'Confirm',
        message,
        confirmColor: options.confirmColor ?? 'primary',
        onConfirm,
      }
      this.confirmDialogShow = true
    },
    handleConfirmDialogConfirm() {
      const onConfirm = this.confirmDialog.onConfirm
      this.confirmDialog.onConfirm = null
      onConfirm && onConfirm()
    },
    confirmSwitchDataset(proceed: () => void) {
      if (this.datasetRepository.activeDataset.tempPoints.length === 0) {
        proceed()
        return
      }

      this.openConfirmDialog(
        'There are unconfirmed interpolated points. Do you want to discard them and switch to a different dataset?',
        proceed,
        { title: 'Switch dataset?' },
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
      if (id === this.datasetRepository.activeDatasetId) return

      this.confirmSwitchDataset(() => this.activateDataset(id))
    },
    handleOnClickViewAll() {
      this.confirmSwitchDataset(() => {
        this.interpolator.isActive && this.interpolator.clearPreview()
        this.datasetRepository.setActiveDataset(0)
        this.canvasHandler.clearMask()
        this.canvasHandler.maskMode = MASK_MODE.UNSET
      })
    },
    handleOnClickAddDatasetButton() {
      this.confirmSwitchDataset(() => {
        this.historyManager.capture()
        this.datasetRepository.createNewDataset()

        this.datasetRepository.lastDataset.setAxisSetId(
          this.axisSetRepository.activeAxisSetId,
        )

        this.activateDataset(this.datasetRepository.lastDatasetId)
      })
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

      this.openConfirmDialog(
        `Are you sure to delete '${targetDataset.name}'? This operation is irreversible.`,
        () => this.removeDataset(targetDataset.id),
        { title: 'Delete dataset?', confirmColor: 'error' },
      )
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

      this.openConfirmDialog(
        `Are you sure to delete all ${this.datasetRepository.datasets.length} datasets? This will remove ${totalPoints} data points. This operation is irreversible.`,
        () => this.removeAllDatasets(),
        { title: 'Delete all datasets?', confirmColor: 'error' },
      )
    },
    removeAllDatasets() {
      this.historyManager.capture()
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
        this.magnifier.effectiveDigits,
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

      // INFO: (#289) this used to run instantly with zero confirmation,
      // even with many points on screen
      this.openConfirmDialog(
        `Are you sure you want to clear all ${dataset.points.length} points in '${dataset.name}'?`,
        () => {
          this.historyManager.capture()
          dataset.clearPoints()
          this.interpolator.clearPreview()
        },
        { title: 'Clear dataset points?', confirmColor: 'error' },
      )
    },
  },
})
</script>
