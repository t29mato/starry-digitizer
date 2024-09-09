<template>
  <div>
    <canvas-point
      v-for="point in datasetRepository.activeDataset.scaledPoints(
        canvasHandler.scale,
      )"
      :key="point.id"
      :point="point"
      :isActive="
        datasetRepository.activeDataset.activePointIds.includes(point.id)
      "
      :isVisible="
        datasetRepository.activeDataset.visiblePointIds.includes(point.id)
      "
      :isManuallyAdded="
        datasetRepository.activeDataset.manuallyAddedPointIds.includes(point.id)
      "
    ></canvas-point>
    <canvas-point
      v-for="(tempPoint, i) in datasetRepository.activeDataset.scaledTempPoints(
        canvasHandler.scale,
      )"
      :key="i"
      :point="tempPoint"
      :isActive="false"
      :isVisible="true"
      :isTemporary="true"
      :isManuallyAdded="false"
    ></canvas-point>
  </div>
</template>

<script lang="ts">
import CanvasPoint from '@/presentation/components/Canvas/CanvasPoint.vue'
import { defineComponent } from 'vue'

import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  components: {
    CanvasPoint,
  },
  data() {
    return {
      canvasHandler,
      datasetRepository,
    }
  },

  methods: {},
})
</script>
