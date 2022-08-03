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
          :class="dataset.id === activeDataset.id && 'blue lighten-4'"
        >
          <v-list-item-content>
            <v-list-item-title
              :class="dataset.id === activeDataset.id && 'font-weight-bold'"
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
                  @click="popDataset"
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
                  :plots="activeCalculatedPlots"
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
import Clipboard from '@/components/Export/Clipboard.vue'
import { datasetMapper } from '@/store/modules/dataset'
import { Plots } from '@/types'
import { Axes } from '@/domains/axes'
import XYAxesCalculator from '@/domains/XYAxesCalculator'
const am = Axes.instance

export default Vue.extend({
  components: {
    Clipboard,
  },
  data() {
    return {
      shouldShowEditDialog: false,
      shouldShowActiveDataset: false,
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['activeDataset', 'datasets']),
    activeCalculatedPlots(): Plots {
      const newPlots = this.activeDataset.plots.map((plot) => {
        const { xV, yV } = this.calculateXY(plot.xPx, plot.yPx)
        return {
          id: plot.id,
          xPx: plot.xPx,
          yPx: plot.yPx,
          xV,
          yV,
        }
      })
      return newPlots
    },
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
    openEditDialog() {
      this.shouldShowEditDialog = true
    },
    calculateXY(x: number, y: number): { xV: string; yV: string } {
      // INFO: 軸の値が未決定の場合は、ピクセルをそのまま表示
      if (!am.validateAxes()) {
        return { xV: '0', yV: '0' }
      }
      const calculator = new XYAxesCalculator(
        {
          x1: am.x1,
          x2: am.x2,
          y1: am.y1,
          y2: am.y2,
        },
        {
          x: am.xIsLog,
          y: am.yIsLog,
        }
      )
      return calculator.calculateXYValues(x, y)
    },
  },
})
</script>
