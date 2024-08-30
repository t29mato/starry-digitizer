<template>
  <div>
    <h4>
      Dataset List
      <v-btn @click="handleOnClickAddDatasetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveDatasetButton"
        :disabled="datasetRepository.datasets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-list
      density="compact"
      class="mb-5 mt-1 pa-0"
      style="min-height: 154px; outline: solid 1px gray"
    >
      <v-list-item
        v-for="dataset in datasetRepository.datasets"
        :key="dataset.id"
        class="pl-2 c__dataset-item"
        link
        @click="handleOnClickDataset(dataset.id)"
        :class="
          dataset.id === datasetRepository.activeDataset.id &&
          'bg-yellow-lighten-4'
        "
      >
        <v-row>
          <v-col cols="10">
            <v-text-field
              v-model="dataset.name"
              :placeholder="'dataset ' + dataset.id"
              hide-details
              density="compact"
              class="mt-0 pt-0 pl-2"
              variant="underlined"
            ></v-text-field>
          </v-col>
          <v-col
            cols="2"
            class="pa-0 d-flex align-items-center"
            :class="`dataset-count-${dataset.id}`"
          >
            <span class="align-self-center">
              {{ dataset.plots.length }}
            </span>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>
    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'

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
  methods: {
    shouldContinueSwitchDataset(): boolean {
      if (this.datasetRepository.activeDataset.tempPlots.length === 0)
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
      this.canvasHandler.maskMode = -1
    },
    handleOnClickDataset(id: number) {
      if (
        id === this.datasetRepository.activeDatasetId ||
        !this.shouldContinueSwitchDataset()
      )
        return

      this.activateDataset(id)
    },
    handleOnClickAddDatasetButton() {
      if (!this.shouldContinueSwitchDataset()) return
      this.datasetRepository.createNewDataset()
      this.activateDataset(this.datasetRepository.lastDatasetId)
    },
    removeActiveDataset() {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.removeDataset(
        this.datasetRepository.activeDatasetId,
      )
    },
    handleOnClickRemoveDatasetButton() {
      //NOTE: remove active dataset without confirmation if the active dataset doesn't have data points
      if (this.datasetRepository.activeDataset.plots.length === 0) {
        this.removeActiveDataset()
        return
      }

      window.confirm(
        `Are you sure to delete '${this.datasetRepository.activeDataset.name}'? This operation is irreversible.`,
      ) && this.removeActiveDataset()
    },
  },
})
</script>
