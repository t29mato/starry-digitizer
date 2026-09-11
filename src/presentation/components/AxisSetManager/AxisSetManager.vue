<template>
  <div class="sd-panel">
    <!-- INFO: `sd-panel` is what makes this panel style itself, so a host
         composing the panels needs no `.starry-digitizer` wrapper around
         them; inside one it is a no-op. src/presentation/styles/base.scss. -->
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
import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import {
  requestConfirmation,
  useDigitizerOptions,
} from '@/presentation/digitizerOptions'
// INFO: the axis-set use cases live in the application layer so a host that
// replaces this panel gets the same behaviour (call order, undo capture,
// dataset re-binding) without reimplementing it. This component only decides
// whether to ask the user first. See axisSetOperations.ts.
import {
  activateAxisSet,
  addAxisSet,
  removeAxisSet,
} from '@/application/utils/axisSetOperations'

export default defineComponent({
  components: { SdButton, SdTextField },
  setup() {
    const ctx = useDigitizerContext()
    const { axisSetRepository, datasetRepository } = ctx
    const options = useDigitizerOptions()
    return {
      ctx,
      axisSetRepository,
      datasetRepository,
      options,
    }
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
    handleOnClickAxisSet(id: number) {
      if (id === this.axisSetRepository.activeAxisSetId) return

      // INFO: not a mere selection — it re-binds the active dataset to this
      // axis set, so it goes through the use case (and its undo snapshot).
      activateAxisSet(this.ctx, id)
    },
    handleOnClickAddAxisSetButton() {
      addAxisSet(this.ctx)
    },
    async handleOnClickRemoveAxisSetButton() {
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

        if (!(await requestConfirmation(this.options, confirmMessage))) {
          return
        }

        // INFO: the host's dialog can take an arbitrary amount of time, and
        // the digitizer stays interactive behind it — by the time the answer
        // arrives the user may have switched axis sets, or another one may
        // have been added or removed. Everything above was computed before
        // the question was asked, so re-check that the plan the user agreed
        // to still describes reality and give up if it does not: silently
        // removing a *different* axis set than the one named in the message
        // would be far worse than doing nothing.
        if (
          this.axisSetRepository.activeAxisSet !== targetAxisSet ||
          !this.axisSetRepository.axisSets.includes(alternativeAxisSet)
        ) {
          return
        }
      }

      // INFO: the removal, the re-binding of every orphaned dataset and the
      // manual-mode follow-up all live in the use case, so they happen under
      // ONE undo snapshot — the user pressed one button. It also re-reads the
      // connections instead of reusing the list built for the message: a
      // dataset moved to another axis set while the dialog was open must keep
      // that one, and a dataset moved *onto* the target in the meantime must
      // still be rescued.
      removeAxisSet(this.ctx, targetAxisSet.id, alternativeAxisSet.id)
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
