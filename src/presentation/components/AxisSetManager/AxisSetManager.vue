<template>
  <div>
    <h4>
      XY Axes List
      <sd-button
        @click="handleOnClickAddAxisSetButton"
        size="x-small"
        class="ml-2"
        :icon="mdiPlus"
        title="Add axis set"
        data-cy="add-axis-set"
        :disabled="options.readonly"
      />
      <sd-button
        size="x-small"
        @click="handleOnClickRemoveAxisSetButton"
        :icon="mdiMinus"
        title="Remove axis set"
        data-cy="remove-axis-set"
        :disabled="options.readonly || axisSetRepository.axisSets.length === 1"
        class="ml-2"
      />
    </h4>
    <div class="mb-2 mt-1 pa-0 c__axisSet-list">
      <div
        v-for="axisSet in axisSetRepository.axisSets"
        :key="axisSet.id"
        class="pl-2 c__axisSet-item"
        @click="handleOnClickAxisSet(axisSet.id)"
        :class="{
          'bg-yellow-lighten-4':
            axisSet.id === axisSetRepository.activeAxisSet.id,
        }"
      >
        <div class="sd-row">
          <div class="sd-col-10">
            <sd-text-field
              v-model="axisSet.name"
              :placeholder="'axisSet ' + axisSet.id"
              class="pl-2"
              variant="underlined"
              :readonly="options.readonly"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- TODO: モーダル上でデータセットを選べるようにする -->
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mdiPlus, mdiMinus } from '@mdi/js'

import { SdButton, SdTextField } from '@/presentation/ui'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { MANUAL_MODE } from '@/constants'

export default defineComponent({
  components: { SdButton, SdTextField },
  setup() {
    const { canvasHandler, axisSetRepository, datasetRepository } =
      useDigitizerContext()
    const options = useDigitizerOptions()
    return { canvasHandler, axisSetRepository, datasetRepository, options }
  },
  data() {
    return {
      mdiPlus,
      mdiMinus,
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
        this.canvasHandler.manualMode = MANUAL_MODE.UNSET
      } else {
        this.canvasHandler.manualMode = MANUAL_MODE.ADD
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
        this.datasetRepository.datasets.filter(
          (dataset) => dataset.axisSetId === targetAxisSet.id,
        )

      const targetAxisSetIndex =
        this.axisSetRepository.axisSets.indexOf(targetAxisSet)
      const previousAxisSet =
        this.axisSetRepository.axisSets[targetAxisSetIndex - 1]

      const alternativeAxisSet =
        targetAxisSetIndex === 0
          ? this.axisSetRepository.axisSets[1]
          : previousAxisSet || this.axisSetRepository.axisSets[0]

      // Early return if the user cancels the confirmation dialog
      if (targetAxisSet.atLeastOneCoordOrValueIsChanged) {
        const confirmMessage = `Are you sure to remove '${
          this.axisSetRepository.activeAxisSet.name
        }'? After the removal, '${
          alternativeAxisSet.name
        }' will be applied to the following datasets: ${datasetsConnectedToTargetAxisSet
          .map((dataset) => dataset.name)
          .toString()}`

        if (!window.confirm(confirmMessage)) {
          return
        }
      }

      this.removeActiveAxisSet()

      datasetsConnectedToTargetAxisSet.forEach((dataset) => {
        dataset.setAxisSetId(alternativeAxisSet.id)
      })

      this.axisSetRepository.setActiveAxisSet(alternativeAxisSet.id)

      if (alternativeAxisSet.nextAxis) {
        this.canvasHandler.manualMode = MANUAL_MODE.UNSET
      } else {
        this.canvasHandler.manualMode = MANUAL_MODE.ADD
      }
    },
  },
})
</script>

<style scoped lang="scss">
// INFO: replaces <v-list density="compact"> + <v-list-item link>: a plain
// scrollable list whose rows highlight on hover the way the Vuetify one did.
// The hover rule skips the active row so the yellow highlight stays visible.
// INFO: heights are custom properties so a host can compact the sidebar
// without overriding internal class names.
.c__axisSet-list {
  min-height: var(--sd-axis-list-min-height, 8vh);
  max-height: var(--sd-axis-list-max-height, 20vh);
  overflow-y: auto;
  outline: solid 1px gray;
}
.c__axisSet-item {
  cursor: pointer;
  padding-top: 2px;
  padding-bottom: 2px;

  &:hover:not(.bg-yellow-lighten-4) {
    background-color: rgba(0, 0, 0, 0.04);
  }
}
</style>
