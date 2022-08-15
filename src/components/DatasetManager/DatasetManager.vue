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
      <v-btn small @click="openEditDialog">Manage Datasets</v-btn>
      <v-btn
        small
        class="mt-2"
        @click="shouldShowActiveDataset = true"
        :disabled="datasets.activeDataset.plots.length === 0"
        >Show Plots</v-btn
      >
    </v-card>
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
      shouldShowActiveDataset: false,
    }
  },
  computed: {
    ...datasetMapper.mapGetters(['datasets']),
    activeCalculatedPlots(): Plots {
      const newPlots = this.datasets.activeDataset.plots.map((plot) => {
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
