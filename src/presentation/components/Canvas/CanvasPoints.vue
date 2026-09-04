<template>
  <div>
    <!-- Show all datasets mode -->
    <template v-if="datasetRepository.isViewAllMode">
      <template v-for="dataset in datasetRepository.datasets">
        <canvas-point
          v-for="point in dataset.scaledPoints(canvasHandler.scale)"
          :key="`${dataset.id}-${point.id}`"
          :point="point"
          :isActive="
            dataset.id === datasetRepository.activeDatasetId &&
            dataset.activePointIds.includes(point.id)
          "
          :isVisible="dataset.visiblePointIds.includes(point.id)"
          :isManuallyAdded="dataset.manuallyAddedPointIds.includes(point.id)"
          :datasetColor="datasetRepository.getDatasetColor(dataset.id)"
        ></canvas-point>
      </template>
      <!-- Show temp points only for active dataset -->
      <canvas-point
        v-for="(
          tempPoint, i
        ) in datasetRepository.activeDataset.scaledTempPoints(
          canvasHandler.scale,
        )"
        :key="`temp-${i}`"
        :point="tempPoint"
        :isActive="false"
        :isVisible="true"
        :isTemporary="true"
        :isManuallyAdded="false"
      ></canvas-point>
    </template>

    <!-- Show active dataset only mode (default) -->
    <template v-else>
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
          datasetRepository.activeDataset.manuallyAddedPointIds.includes(
            point.id,
          )
        "
      ></canvas-point>
      <canvas-point
        v-for="(
          tempPoint, i
        ) in datasetRepository.activeDataset.scaledTempPoints(
          canvasHandler.scale,
        )"
        :key="`temp-${i}`"
        :point="tempPoint"
        :isActive="false"
        :isVisible="true"
        :isTemporary="true"
        :isManuallyAdded="false"
      ></canvas-point>
    </template>
  </div>
</template>

<script lang="ts">
import CanvasPoint from '@/presentation/components/Canvas/CanvasPoint.vue'
import { defineComponent } from 'vue'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'

export default defineComponent({
  components: {
    CanvasPoint,
  },
  setup() {
    const { canvasHandler, datasetRepository } = useDigitizerContext()
    return { canvasHandler, datasetRepository }
  },
})
</script>
