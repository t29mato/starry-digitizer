<template>
  <div>
    <h4>Datasets</h4>
    <v-card class="mx-auto" flat>
      <v-list dense>
        <v-list-item
          v-for="dataset in datasets"
          :key="dataset.id"
          link
          @click="setActiveDataset(dataset.id)"
          :class="dataset.id === activeDatasetId && 'blue lighten-4'"
        >
          <v-list-item-content>
            <v-list-item-title
              :class="dataset.id === activeDatasetId && 'font-weight-bold'"
              v-text="`${dataset.name} (${dataset.plots.length})`"
            ></v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <v-btn small @click="openEditDialog">Manage Datasets</v-btn>
      <v-btn
        small
        class="mt-2"
        @click="shouldShowActiveDataset = true"
        :disabled="activeDataset.plots.length === 0"
        >Show Plots</v-btn
      >
    </v-card>
    <v-dialog
      v-model="shouldShowEditDialog"
      origin="center"
      scrollable
      max-width="500px"
    >
      <v-card height="80vh">
        <v-card-title>
          <span class="text-h5">Manage Datasets</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col>
                <v-btn @click="addDataset" small
                  ><v-icon>mdi-plus</v-icon></v-btn
                >
                <v-btn
                  small
                  @click="removeColumn"
                  :disabled="this.datasets.length === 1"
                  ><v-icon>mdi-minus</v-icon></v-btn
                >
                <v-simple-table dense>
                  <template v-slot:default>
                    <thead>
                      <tr>
                        <th class="text-left">ID</th>
                        <th class="text-left">Name</th>
                        <th class="text-left">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="dataset in datasets" :key="dataset.id">
                        <td>{{ dataset.id }}</td>
                        <td>
                          <v-text-field
                            v-model="dataset.name"
                            :placeholder="'dataset ' + dataset.id"
                          ></v-text-field>
                        </td>
                        <td>{{ dataset.plots.length }}</td>
                      </tr>
                    </tbody>
                  </template>
                </v-simple-table>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="shouldShowEditDialog = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="shouldShowActiveDataset"
      origin="center"
      scrollable
      max-width="500px"
    >
      <v-card height="80vh">
        <v-card-title>
          <span class="text-h5">Show Plots</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col>
                <clipboard
                  :plots="calculatedPlots"
                  :exportBtnText="exportBtnText"
                ></clipboard>
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
import { Dataset } from '@/types'
import Clipboard from '@/components/Export/Clipboard.vue'
import { DatasetManager as DM } from '@/domains/DatasetManager'
const dm = DM.instance

export default Vue.extend({
  components: {
    Clipboard,
  },
  data() {
    return {
      sideMenus: [
        {
          title: 'Datasets',
          action: 'mdi-silverware-fork-knife',
          active: true,
        },
      ],
      shouldShowEditDialog: false,
      shouldShowActiveDataset: false,
      activeDatasetId: dm.activeDatasetId,
      datasets: dm.datasets,
    }
  },
  computed: {
    nextDatasetId(): number {
      if (this.datasets.length === 0) {
        return 1
      }
      return this.datasets[this.datasets.length - 1].id + 1
    },
    activeDataset(): Dataset {
      return dm.activeDataset
    },
    calculatedPlots() {
      return dm.activeCalculatedPlots
    },
  },
  props: {
    exportBtnText: {
      type: String,
      required: false,
    },
  },
  methods: {
    removeColumn() {
      if (this.datasets.length === 1) {
        return
      }
      this.popDataset()
    },
    openEditDialog() {
      this.shouldShowEditDialog = true
    },
    addDataset() {
      dm.addDataset()
    },
    editDataset(datasetId: number, newName: string) {
      dm.editDatasetName(datasetId, newName)
    },
    popDataset() {
      dm.popDataset()
    },
    setActiveDataset(id: number) {
      // INFO: dmに変数代入したかったがVueインスタンスのdataプロパティに反映されなかったのでdataを直接更新。
      this.activeDatasetId = dm.activeDatasetId = id
    },
  },
})
</script>
