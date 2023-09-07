<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="addDataset" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="popDataset"
        :disabled="datasets.datasets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-list
      density="compact"
      height="20vh"
      class="overflow-y-auto mb-1 mt-1 pa-0"
      variant="outlined"
    >
      <v-list-item
        height="20vh"
        v-for="dataset in datasets.datasets"
        :key="dataset.id"
        class="pl-2"
        link
        @click="activateDataset(dataset.id)"
        :class="dataset.id === datasets.activeDataset.id && 'blue lighten-4'"
      >
        <v-row>
          <v-col cols="10">
            <v-text-field
              v-model="dataset.name"
              :placeholder="'dataset ' + dataset.id"
              hide-details
              density="compact"
              class="mt-0 pt-0"
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

import { useCanvasStore } from '@/store/canvas'
import { useDatasetsStore } from '@/store/datasets'
import { mapState, mapActions } from 'pinia'

export default defineComponent({
  components: {},
  data() {
    return {
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
    }
  },
  computed: {
    ...mapState(useDatasetsStore, ['datasets']),
    ...mapState(useCanvasStore, ['canvas']),
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
    ...mapActions(useDatasetsStore, [
      'addDataset',
      'setActiveDataset',
      'popDataset',
    ]),
    activateDataset(id: number) {
      this.setActiveDataset(id)
      // INFO: データセットが変えた時はマスクをクリアすることが多いので。
      this.canvas.clearMask()
      this.canvas.maskMode = -1
    },
  },
})
</script>
