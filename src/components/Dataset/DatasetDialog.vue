<template>
  <div>
    <!-- TODO: DatasetDialogという名前を変える。ボタンもここに入ってきてしまったので。 -->
    <v-btn small @click="openDialog">Manage Dataset</v-btn>
    <v-dialog v-model="showDialog" origin="center" scrollable max-width="500px">
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
                        <!-- TODO: プロット数を表示する -->
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
                      </tr>
                    </tbody>
                  </template>
                </v-simple-table>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="showDialog = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Datasets } from '@/types'
export default Vue.extend({
  data() {
    return {
      datasetCount: 1,
      showDialog: false,
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
    openDialog() {
      this.showDialog = true
    },
  },
})
</script>
