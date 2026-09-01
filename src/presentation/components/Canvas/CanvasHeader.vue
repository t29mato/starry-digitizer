<template>
  <div class="d-flex justify-space-between align-center flex-wrap">
    <div class="c__current-dataset-and-axis">
      Dataset: <span>{{ currentDatasetName }}</span> / XY Axes:
      <span>{{ axisSetRepository.activeAxisSet.name }}</span>
    </div>
    <span class="mb-1">{{ showCanvasScale }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

// INFO: Undo/Redo and zoom controls used to live here as buttons. They now
// live in the App.vue menu bar (Edit/View) plus their existing keyboard
// shortcuts, so this header only shows read-only canvas status and stays
// out of the way of the graph image.
export default defineComponent({
  data() {
    return {
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  computed: {
    showCanvasScale(): string {
      return Math.trunc(this.canvasHandler.scale * 100) + '%'
    },
    currentDatasetName(): string {
      if (this.datasetRepository.activeDatasetId === 0) {
        return 'All Datasets (View Only)'
      }
      return this.datasetRepository.activeDataset.name
    },
  },
})
</script>
<style lang="scss" scoped>
.c {
  &__current-dataset-and-axis {
    font-size: 0.9rem;
    color: rgb(73, 73, 73);
    margin-right: 40px;

    span {
      font-weight: bold;
    }
  }
}
</style>
