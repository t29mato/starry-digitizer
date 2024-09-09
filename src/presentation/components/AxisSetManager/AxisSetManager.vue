<template>
  <div>
    <h4>
      XY Axes List
      <v-btn @click="handleOnClickAddAxisSetButton" size="x-small" class="ml-2"
        ><v-icon>mdi-plus</v-icon></v-btn
      >
      <v-btn
        size="x-small"
        @click="handleOnClickRemoveAxisSetButton"
        :disabled="axisSetRepository.axisSets.length === 1"
        class="ml-2"
        ><v-icon>mdi-minus</v-icon></v-btn
      >
    </h4>
    <v-list
      density="compact"
      class="mb-5 mt-1 pa-0"
      style="min-height: 154px; outline: solid 1px gray"
    >
      <v-list-item
        v-for="axisSet in axisSetRepository.axisSets"
        :key="axisSet.id"
        class="pl-2 c__axisSet-item"
        link
        @click="handleOnClickAxisSet(axisSet.id)"
        :class="
          axisSet.id === axisSetRepository.activeAxisSet.id &&
          'bg-yellow-lighten-4'
        "
      >
        <v-row>
          <v-col cols="10">
            <v-text-field
              v-model="axisSet.name"
              :placeholder="'axisSet ' + axisSet.id"
              hide-details
              density="compact"
              class="mt-0 pt-0 pl-2"
              variant="underlined"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-list-item>
    </v-list>
    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  components: {},
  data() {
    return {
      canvasHandler,
      interpolator,
      axisSetRepository,
      datasetRepository,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
    }
  },
  computed: {
    allAxisCoordsAreFilled() {
      return (
        this.axisSetRepository.activeAxisSet.hasXAxis &&
        this.axisSetRepository.activeAxisSet.hasYAxis
      )
    },
  },
  methods: {
    activateAxisSet(id: number) {
      this.axisSetRepository.setActiveAxisSet(id)
      this.datasetRepository.activeDataset.setAxisSetId(id)

      //NOTE: If axis coords are not calibrated, change manualMode for calibration. Otherwise automatically set to ADD mode
      if (this.axisSetRepository.activeAxisSet.nextAxis) {
        this.canvasHandler.manualMode = -1
      } else {
        this.canvasHandler.manualMode = 0
      }
    },
    handleOnClickAxisSet(id: number) {
      if (id === this.axisSetRepository.activeAxisSetId) return

      this.activateAxisSet(id)
    },
    handleOnClickAddAxisSetButton() {
      this.axisSetRepository.createNewAxisSet()
      this.activateAxisSet(this.axisSetRepository.lastAxisSetId)
    },
    removeActiveAxisSet() {
      this.axisSetRepository.removeAxisSet(
        this.axisSetRepository.activeAxisSetId,
      )
    },
    handleOnClickRemoveAxisSetButton() {
      //TODO: Move these logics to domain service and add test...
      const targetAxisSet = this.axisSetRepository.activeAxisSet

      const datasetsConnectedToTargetAxisSet =
        this.datasetRepository.datasets.filter((dataset) => {
          return dataset.axisSetId === targetAxisSet.id
        })

      const targetAxisSetIndex =
        this.axisSetRepository.axisSets.indexOf(targetAxisSet)
      const previousAxisSet =
        this.axisSetRepository.axisSets[targetAxisSetIndex - 1]

      const alternativeAxisSet =
        targetAxisSetIndex === 0
          ? this.axisSetRepository.axisSets[1]
          : previousAxisSet || this.axisSetRepository.axisSets[0]

      if (!targetAxisSet.atLeastOneCoordOrValueIsChanged) {
        this.removeActiveAxisSet()
      } else {
        window.confirm(
          `Are you sure to remove '${
            this.axisSetRepository.activeAxisSet.name
          }'? After the removal, '${
            alternativeAxisSet.name
          }' will be applied to the following datasets: ${datasetsConnectedToTargetAxisSet
            .map((dataset) => dataset.name)
            .toString()}`,
        ) && this.removeActiveAxisSet()
      }

      datasetsConnectedToTargetAxisSet.forEach((dataset) => {
        dataset.setAxisSetId(alternativeAxisSet.id)
      })

      this.axisSetRepository.setActiveAxisSet(alternativeAxisSet.id)

      if (alternativeAxisSet.nextAxis) {
        this.canvasHandler.manualMode = -1
      } else {
        this.canvasHandler.manualMode = 0
      }
    },
  },
})
</script>
