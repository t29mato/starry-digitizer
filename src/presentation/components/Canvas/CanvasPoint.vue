<template>
  <div
    class="canvas-point"
    :style="{
      position: 'absolute',
      top: top,
      left: left,
      cursor: cursor,
      width: size,
      height: size,
      'background-color': backgroundColor,
      border: '1px solid white',
      'border-radius': borderRadius,
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
      zIndex: zIndex,
    }"
    @click="click"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Point } from '@/domain/models/dataset/datasetInterface'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { STYLE } from '@/constants'

export default defineComponent({
  data() {
    return {
      interpolator,
      canvasHandler,
      datasetRepository,
      pointOpacity: STYLE.POINT_OPACITY,
      tempPointOpacity: STYLE.TEMP_POINT_OPACITY,
      pointSizePx: STYLE.POINT_SIZE_PX,
      tempPointSizePx: STYLE.TEMP_POINT_SIZE_PX,
    }
  },
  computed: {
    xPx(): number {
      return this.point.xPx
    },
    yPx(): number {
      return this.point.yPx
    },
    cursor(): string | undefined {
      const mode = this.canvasHandler.manualMode
      if (mode === 1 || mode === 2) {
        return 'pointer'
      }
      return undefined
    },
    opacity() {
      return this.isTemporary ? this.tempPointOpacity : this.pointOpacity
    },
    backgroundColor() {
      if (this.isActive) {
        return '#ff0000'
      }

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '#6a5acd'
      }

      return '#1e90ff'
    },
    borderRadius(): string {
      //TODO: 本来はinterpolatorのanchor pointsであるべきものを、暫定的にpointで表現しているので、最終的にここは消したい

      if (this.isManuallyAdded && this.interpolator.isActive) {
        return '0'
      }

      return '50%'
    },
    size(): string {
      if (this.isTemporary) {
        return this.tempPointSizePx + 'px'
      }

      return this.pointSizePx + 'px'
    },
    top(): string {
      if (this.isTemporary) {
        return this.yPx - this.tempPointSizePx / 2 + 'px'
      }

      return this.yPx - this.pointSizePx / 2 + 'px'
    },
    left(): string {
      if (this.isTemporary) {
        return this.xPx - this.tempPointSizePx / 2 + 'px'
      }

      return this.xPx - this.pointSizePx / 2 + 'px'
    },
    zIndex(): string {
      if (this.isTemporary) {
        return '1'
      }

      return '2'
    },
  },
  props: {
    point: {
      type: Object as () => Point,
      required: true,
    },
    isActive: {
      type: Boolean,
    },
    isVisible: {
      type: Boolean,
    },
    isTemporary: {
      type: Boolean,
      default: false,
    },
    isManuallyAdded: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    click(event: MouseEvent) {
      switch (this.canvasHandler.manualMode) {
        // INFO: CanvasMain Component -> point method
        case 0:
          return
        case 1:
          if (event.ctrlKey || event.metaKey) {
            this.datasetRepository.activeDataset.toggleActivatedPoint(
              this.point.id,
            )
            return
          }
          this.datasetRepository.activeDataset.switchActivatedPoint(
            this.point.id,
          )
          return
        case 2:
          this.datasetRepository.activeDataset.clearPoint(this.point.id)

          return
        default:
          break
      }
    },
  },
})
</script>
