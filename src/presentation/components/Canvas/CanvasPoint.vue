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
      'box-sizing': 'border-box',
      'background-color': backgroundColor,
      // INFO: 白一色の縁取りだと白背景(または明るい背景色)のグラフで見えなく
      // なるため、白+黒の二重リングにして、明暗どちらの背景でも最低限どちらか
      // の縁でコントラストを確保する。box-shadowはレイアウトに影響しないため
      // borderの代わりに使う。
      'box-shadow': '0 0 0 1px white, 0 0 0 2px black',
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

import { Point } from '@/@types/types'

import { useDigitizerContext } from '@/presentation/digitizerContextProvider'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { MANUAL_MODE, STYLE } from '@/constants'

export default defineComponent({
  setup() {
    const { interpolator, canvasHandler, datasetRepository } =
      useDigitizerContext()
    const options = useDigitizerOptions()
    return { interpolator, canvasHandler, datasetRepository, options }
  },
  data() {
    return {
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
      if (mode === MANUAL_MODE.EDIT || mode === MANUAL_MODE.DELETE) {
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

      // Use dataset color if provided (for show all datasets mode)
      if (this.datasetColor) {
        return this.datasetColor
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
    datasetColor: {
      type: String,
      default: undefined,
    },
  },
  methods: {
    click(event: MouseEvent) {
      // INFO: readonly mode is view-only: selecting or deleting points is disabled.
      if (this.options.readonly) {
        return
      }
      switch (this.canvasHandler.manualMode) {
        // INFO: CanvasMain Component -> point method
        case MANUAL_MODE.ADD:
          return
        case MANUAL_MODE.EDIT:
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
        case MANUAL_MODE.DELETE:
          this.datasetRepository.activeDataset.clearPoint(this.point.id)

          return
        default:
          break
      }
    },
  },
})
</script>
