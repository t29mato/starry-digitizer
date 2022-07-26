<template>
  <v-dialog :value="showDialog" origin="center" scrollable max-width="500px">
    <v-card height="80vh">
      <v-card-title>
        <!-- TODO: Manage Datasetに変える -->
        <span class="text-h5">Add Dataset</span>
      </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col>
              <v-btn @click="addColumn" small><v-icon>mdi-plus</v-icon></v-btn>
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="dataset in datasets" :key="dataset.id">
                      <td>{{ dataset.id }}</td>
                      <td>
                        <v-text-field v-model="dataset.name"></v-text-field>
                      </td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="clickCloseBtn"> Close </v-btn>
        <v-btn @click="clickAddBtn"> Add </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import { Datasets } from '@/types'
export default Vue.extend({
  data() {
    return {
      datasetCount: 1,
      datasets: [
        {
          id: this.nextDatasetId,
          name: `dataset ${this.nextDatasetId}`,
          plots: [],
        },
      ] as Datasets,
    }
  },
  computed: {
    nextNewDatasetId(): number {
      if (this.datasets.length === 0) {
        return 1
      }
      return this.datasets[this.datasets.length - 1].id + 1
    },
  },
  props: {
    showDialog: {
      type: Boolean,
      required: true,
    },
    closeDialog: {
      type: Function,
      required: true,
    },
    addDatasets: {
      type: Function,
      required: true,
    },
    nextDatasetId: {
      type: Number,
      required: true,
    },
  },
  methods: {
    inputCount(value: string) {
      const count = parseInt(value)
      if (count - this.datasetCount === 1) {
        this.datasets.push({
          id: this.nextNewDatasetId,
          name: 'hoge',
          plots: [],
        })
      }
    },
    addColumn() {
      this.datasets.push({
        id: this.nextNewDatasetId,
        name: `dataset ${this.nextNewDatasetId}`,
        plots: [],
      })
    },
    removeColumn() {
      if (this.datasets.length === 1) {
        return
      }
      this.datasets.pop()
    },
    clickAddBtn() {
      this.addDatasets(this.datasets)
      this.datasets = [
        {
          id: this.nextNewDatasetId,
          name: `dataset ${this.nextNewDatasetId}`,
          plots: [],
        },
      ]
    },
    clickCloseBtn() {
      this.closeDialog()
    },
  },
})
</script>
