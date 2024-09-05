<template>
  <div class="d-flex justify-space-between align-center flex-wrap">
    <div class="c__current-dataset-and-axis">
      Dataset: <span>{{ datasetRepository.activeDataset.name }}</span> / XY
      Axes: <span>{{ axisSetRepository.activeAxisSet.name }}</span>
    </div>
    <div class="d-flex justify-end mt-1" style="margin-left: auto">
      <div class="ml-2">
        <v-btn size="small" @click="handleOnClickScaleDownButton"
          ><v-icon>mdi-minus</v-icon></v-btn
        >
        <v-btn size="small" class="ml-2" @click="handleOnClickScaleUpButton"
          ><v-icon>mdi-plus</v-icon></v-btn
        >
        <v-btn
          id="reset-canvas-scale"
          size="small"
          class="ml-2"
          @click="handleOnClickResetScaleButton"
          >100%</v-btn
        >
        <v-btn size="small" class="ml-2" @click="handleOnClickFitButton"
          >Fit</v-btn
        >
      </div>
      <span class="ma-1">{{ showCanvasScale }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'

export default defineComponent({
  data() {
    return {
      interpolator,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  computed: {
    showCanvasScale(): string {
      return Math.trunc(this.canvasHandler.scale * 100) + '%'
    },
  },
  methods: {
    handleOnClickScaleUpButton() {
      this.canvasHandler.scaleUp()
      this.interpolator.resizeCanvas()
    },
    handleOnClickScaleDownButton() {
      this.canvasHandler.scaleDown()
      this.interpolator.resizeCanvas()
    },
    handleOnClickResetScaleButton() {
      this.canvasHandler.drawOriginalSizeImage()
      this.interpolator.resizeCanvas()
    },
    handleOnClickFitButton() {
      this.canvasHandler.drawFitSizeImage()
      this.interpolator.resizeCanvas()
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
