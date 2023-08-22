<!--<template>-->
<!--  <v-container>-->
<!--    <v-row>-->
<!--      <v-col cols="3">-->
<!--        <h3>Datasets</h3>-->
<!--        <v-list dense>-->
<!--          <v-list-item-->
<!--            v-for="dataset in datasets.datasets"-->
<!--            :key="dataset.id"-->
<!--            class="pl-2"-->
<!--            link-->
<!--            @click="activateDataset(dataset.id)"-->
<!--            :class="-->
<!--              dataset.id === datasets.activeDataset.id && 'blue lighten-4'-->
<!--            "-->
<!--          >-->
<!--            <v-list-item-content>-->
<!--              <v-list-item-title v-text="dataset.name"></v-list-item-title>-->
<!--            </v-list-item-content>-->
<!--          </v-list-item>-->
<!--        </v-list>-->
<!--      </v-col>-->
<!--      <v-col cols="6">-->
<!--        <clipboard-->
<!--          :sortKey="sortKey"-->
<!--          :sortOrder="sortOrder"-->
<!--          :exportBtnText="exportBtnText"-->
<!--          :exportBtnClick="exportBtnClick"-->
<!--        ></clipboard>-->
<!--      </v-col>-->
<!--      <v-col cols="3">-->
<!--        <h3>Sort</h3>-->
<!--        <v-select-->
<!--          v-model="sortKey"-->
<!--          :items="sortKeys"-->
<!--          label="sort key"-->
<!--        ></v-select>-->
<!--        <v-select-->
<!--          v-model="sortOrder"-->
<!--          :items="sortOrders"-->
<!--          label="sort order"-->
<!--        ></v-select>-->
<!--      </v-col>-->
<!--    </v-row>-->
<!--  </v-container>-->
<!--</template>-->
<!--<script lang="ts">-->
<!---->
<!--import Clipboard from '@/components/Export/Clipboard.vue'-->
<!--import { datasetMapper } from '@/store/modules/dataset'-->
<!--import { canvasMapper } from '@/store/modules/canvas'-->

<!--export default Vue.extend({-->
<!--  components: { Clipboard },-->
<!--  props: {-->
<!--    exportBtnText: {-->
<!--      type: String,-->
<!--      required: false,-->
<!--    },-->
<!--    exportBtnClick: {-->
<!--      type: Function,-->
<!--      required: false,-->
<!--    },-->
<!--  },-->
<!--  data() {-->
<!--    return {-->
<!--      shouldShowActiveDataset: false,-->
<!--      sortKey: 'as added',-->
<!--      sortKeys: ['as added', 'x', 'y'],-->
<!--      sortOrder: 'ascending',-->
<!--      sortOrders: ['ascending', 'descending'],-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    ...datasetMapper.mapGetters(['datasets']),-->
<!--    ...canvasMapper.mapGetters(['canvas']),-->
<!--  },-->
<!--  methods: {-->
<!--    ...datasetMapper.mapActions([-->
<!--      'addDataset',-->
<!--      'setActiveDataset',-->
<!--      'popDataset',-->
<!--    ]),-->
<!--    activateDataset(id: number) {-->
<!--      this.setActiveDataset(id)-->
<!--      // INFO: データセットが変えた時はマスクをクリアすることが多いので。-->
<!--      this.canvas.clearMask()-->
<!--      this.canvas.maskMode = -1-->
<!--    },-->
<!--  },-->
<!--})-->
<!--</script>-->
