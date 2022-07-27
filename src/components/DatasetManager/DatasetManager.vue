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
                <v-btn @click="addColumn" small
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
                  :exportPlots="exportPlots"
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
import Vue, { PropType } from 'vue'
import { Datasets, Dataset, Plots } from '@/types'
import Clipboard from '@/components/Export/Clipboard.vue'
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
      datasetCount: 1,
      shouldShowEditDialog: false,
      shouldShowActiveDataset: false,
    }
  },
  computed: {
    nextDatasetId(): number {
      if (this.datasets.length === 0) {
        return 1
      }
      return this.datasets[this.datasets.length - 1].id + 1
    },
  },
  props: {
    datasets: {
      type: Array as PropType<Datasets>,
      required: true,
    },
    addDataset: {
      type: Function,
      required: true,
    },
    editDataset: {
      type: Function,
      required: true,
    },
    popDataset: {
      type: Function,
      required: true,
    },
    setActiveDataset: {
      type: Function,
      required: true,
    },
    exportPlots: {
      type: Function,
      required: false,
    },
    exportBtnText: {
      type: String,
      required: false,
    },
    activeDatasetId: {
      type: Number,
      required: true,
    },
    activeDataset: {
      type: Object as PropType<Dataset>,
      required: true,
    },
    calculatedPlots: {
      type: Array as PropType<Plots>,
      required: true,
    },
  },
  methods: {
    addColumn() {
      this.addDataset({
        id: this.nextDatasetId,
        name: `dataset ${this.nextDatasetId}`,
        plots: [],
      })
    },
    removeColumn() {
      if (this.datasets.length === 1) {
        return
      }
      this.popDataset()
    },
    openEditDialog() {
      this.shouldShowEditDialog = true
    },
  },
})
</script>
