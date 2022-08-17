<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="addDataset" small class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        small
        @click="popDataset"
        :disabled="this.datasets.datasets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-card class="mx-auto mt-2" flat>
      <v-list dense>
        <v-list-item
          v-for="dataset in datasets.datasets"
          :key="dataset.id"
          class="pl-2"
          link
          @click="setActiveDataset(dataset.id)"
          :class="dataset.id === datasets.activeDataset.id && 'blue lighten-4'"
        >
          <v-list-item-content>
            <v-row>
              <v-col cols="10">
                <v-text-field
                  v-model="dataset.name"
                  :placeholder="'dataset ' + dataset.id"
                  hide-details
                  class="mt-0 pt-0"
                ></v-text-field>
              </v-col>
              <v-col cols="2" class="mt-2">
                {{ dataset.plots.length }}
              </v-col>
            </v-row>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <!-- TODO: モーダル上でデータセットを選べるようにする -->
      <v-btn small class="mt-2" @click="shouldShowActiveDataset = true"
        >Show Plots</v-btn
      >
    </v-card>
    <v-dialog
      v-model="shouldShowActiveDataset"
      origin="center"
      scrollable
      max-width="800px"
    >
      <v-card height="80vh">
        <v-card-title>
          <span class="text-h5">Show Plots</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="3">
                <h3>Datasets</h3>
                <v-list dense>
                  <v-list-item
                    v-for="dataset in datasets.datasets"
                    :key="dataset.id"
                    class="pl-2"
                    link
                    @click="setActiveDataset(dataset.id)"
                    :class="
                      dataset.id === datasets.activeDataset.id &&
                      'blue lighten-4'
                    "
                  >
                    <v-list-item-content>
                      <v-list-item-title
                        v-text="dataset.name"
                      ></v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-col>
              <v-col cols="6">
                <clipboard
                  :sortKey="sortKey"
                  :sortOrder="sortOrder"
                  :exportBtnText="exportBtnText"
                ></clipboard>
              </v-col>
              <v-col cols="3">
                <h3>Sort</h3>
                <v-select
                  v-model="sortKey"
                  :items="sortKeys"
                  label="sort key"
                ></v-select>
                <v-select
                  v-model="sortOrder"
                  :items="sortOrders"
                  label="sort order"
                ></v-select>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="shouldShowActiveDataset = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Clipboard from '@/components/Export/Clipboard.vue'
import { datasetMapper } from '@/store/modules/dataset'

export default Vue.extend({
  components: {
    Clipboard,
  },
  data() {
    return {
      shouldShowActiveDataset: false,
      sortKey: 'time',
      sortKeys: ['time', 'x', 'y'],
      sortOrder: 'asc',
      sortOrders: ['asc', 'desc'],
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
  },
  props: {
    exportBtnText: {
      type: String,
      required: false,
    },
  },
  methods: {
    ...datasetMapper.mapActions([
      'addDataset',
      'setActiveDataset',
      'popDataset',
    ]),
  },
})
</script>
