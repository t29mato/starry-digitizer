<template>
  <div>
    <h4>
      Datasets
      <v-btn @click="addDataset" x-small class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        x-small
        @click="popDataset"
        :disabled="this.datasets.datasets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-list dense height="20vh" class="overflow-y-auto mb-1 mt-1 pa-0" outlined>
      <v-list-item
        height="20vh"
        v-for="dataset in datasets.datasets"
        :key="dataset.id"
        class="pl-2"
        link
        @click="activateDataset(dataset.id)"
        :class="dataset.id === datasets.activeDataset.id && 'blue lighten-4'"
      >
        <v-list-item-content>
          <v-row>
            <v-col cols="10">
              <v-text-field
                v-model="dataset.name"
                :placeholder="'dataset ' + dataset.id"
                hide-details
                dense
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
        </v-list-item-content>
      </v-list-item>
    </v-list>
    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters, mapActions } from 'vuex'

export default Vue.extend({
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
    ...mapGetters('datasets', { datasets: 'datasets' }),
    ...mapGetters('canvas', { canvas: 'canvas' }),
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
    ...mapActions('datasets', ['addDataset', 'setActiveDataset', 'popDataset']),
    activateDataset(id: number) {
      this.setActiveDataset(id)
      // INFO: データセットが変えた時はマスクをクリアすることが多いので。
      this.canvas.clearMask()
      this.canvas.maskMode = -1
    },
  },
})
</script>
