<template>
  <div class="sd-panel d-flex justify-space-between align-center flex-wrap">
    <!-- INFO: `sd-panel` is what makes this panel style itself, so a host
         composing the panels needs no `.starry-digitizer` wrapper around
         them; inside one it is a no-op. src/presentation/styles/base.scss. -->
    <!-- INFO: the dataset name is free text the user (or the host, through the
         project DTO) owns, and an empty one is a normal state — the dataset
         panel shows a grey `dataset N` placeholder for exactly that. Rendering
         it unconditionally left `Dataset:  / XY Axes: …`, a separator floating
         after nothing. The segment is dropped whole instead; inventing a name
         here would show one the host never set. -->
    <div class="c__current-dataset-and-axis">
      <template v-if="currentDatasetName">
        Dataset: <span>{{ currentDatasetName }}</span> /
      </template>
      XY Axes: <span>{{ axisSetRepository.activeAxisSet.name }}</span>
    </div>
    <span class="mb-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'

// INFO: Undo/Redo and zoom controls used to live here as buttons. They now
// live in the App.vue menu bar (Edit/View) plus their existing keyboard
// shortcuts, so this header only shows read-only canvas status and stays
// out of the way of the graph image.
export default defineComponent({
  // INFO: Save/Load Project buttons moved to the App.vue File menu, so this
  // header emits nothing today. The declaration keeps the parent's @error
  // listener from falling through onto the root element as a native handler,
  // and leaves the contract in place if a failing action returns here.
  emits: ['error'],
  setup() {
    const { canvasHandler, axisSetRepository, datasetRepository } =
      useDigitizerContext()
    return { canvasHandler, axisSetRepository, datasetRepository }
  },
  computed: {
    showCanvasScale(): string {
      return Math.trunc(this.canvasHandler.scale * 100) + '%'
    },
    // INFO: trimmed, so a name of only spaces counts as "no name" and takes
    // the same path as an empty one instead of printing an invisible label.
    currentDatasetName(): string {
      if (this.datasetRepository.activeDatasetId === 0) {
        return 'All Datasets (View Only)'
      }
      return this.datasetRepository.activeDataset.name.trim()
    },
  },
})
</script>
<style lang="scss" scoped>
.c {
  &__current-dataset-and-axis {
    font-size: 0.9em;
    color: rgb(73, 73, 73);
    margin-right: 40px;

    span {
      font-weight: bold;
    }
  }
}
</style>
