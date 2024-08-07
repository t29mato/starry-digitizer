<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="handleOnClickAddDatasetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickPopDatasetButton"
        :disabled="datasetRepository.datasets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-list
      density="compact"
      height="20vh"
      class="overflow-y-auto mb-5 mt-1 pa-0"
      style="outline: solid 1px gray"
    >
      <v-list-item
        v-for="dataset in datasetRepository.datasets"
        :key="dataset.id"
        class="pl-2"
        link
        @click="activateDataset(dataset.id)"
        :class="
          dataset.id === datasetRepository.activeDataset.id && 'bg-yellow-lighten-4'
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
    activateDataset(id: number) {
      this.interpolator.isActive && this.interpolator.clearPreview()
      this.datasetRepository.setActiveDataset(id)
      // INFO: データセットが変えた時はマスクをクリアすることが多いので。
      this.canvasHandler.clearMask()
      this.canvasHandler.maskMode = -1
    },
    handleOnClickAddDatasetButton() {
      this.datasetRepository.createNewDataset()
    },
    handleOnClickPopDatasetButton() {
      this.datasetRepository.popDataset()
    },
  },
})
</script>
