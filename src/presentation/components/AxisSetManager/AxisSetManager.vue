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

export default defineComponent({
  components: {},
  data() {
    return {
      canvasHandler,
      interpolator,
      axisSetRepository,
      sortKey: 'as added',
      sortKeys: ['as added', 'x', 'y'],
      sortOrder: 'ascending',
      sortOrders: ['ascending', 'descending'],
    }
  },
  methods: {
    activateAxisSet(id: number) {
      this.axisSetRepository.setActiveAxisSet(id)
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
      window.confirm(
        `Are you sure to delete '${this.axisSetRepository.activeAxisSet.name}'? This operation is irreversible.`,
      ) && this.removeActiveAxisSet()
    },
  },
})
</script>
