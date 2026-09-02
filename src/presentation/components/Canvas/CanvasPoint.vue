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
      border: '1px solid white',
      'border-radius': borderRadius,
      visibility: isVisible ? 'visible' : 'hidden',
      opacity: opacity,
      zIndex: zIndex,
    }"
    @click="click"
    @mousedown="mouseDown"
  ></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { Coord, Point } from '@/@types/types'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { historyManager } from '@/instanceStore/applicationServiceInstances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { getMouseCoordFromMouseEvent } from '@/presentation/utils/mouseEventUtilities'
import { MANUAL_MODE, STYLE } from '@/constants'

export default defineComponent({
  data() {
    return {
      interpolator,
      canvasHandler,
      historyManager,
      datasetRepository,
      pointOpacity: STYLE.POINT_OPACITY,
      tempPointOpacity: STYLE.TEMP_POINT_OPACITY,
      pointSizePx: STYLE.POINT_SIZE_PX,
      tempPointSizePx: STYLE.TEMP_POINT_SIZE_PX,
      // INFO: drag-to-move state (EDIT mode only), see mouseDown/handleDrag*
      dragStartCoord: null as Coord | null,
      dragStartPointCoord: null as Coord | null,
      hasCapturedHistoryForDrag: false,
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
  beforeUnmount() {
    // INFO: defensive cleanup in case the point (and this component) is
    // removed from the DOM mid-drag, e.g. via Delete key or undo
    document.removeEventListener('mousemove', this.handleDragMove)
    document.removeEventListener('mouseup', this.handleDragEnd)
  },
  methods: {
    click(event: MouseEvent) {
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
    // INFO: drag-to-move (#273). Click alone (no movement) still goes
    // through `click` above via the browser's native click event; this only
    // adds movement on top of it, tracked with document-level listeners so
    // the drag keeps following the mouse even once it leaves this element
    mouseDown(event: MouseEvent) {
      if (this.canvasHandler.manualMode !== MANUAL_MODE.EDIT) return
      // INFO: left button only
      if (event.button !== 0) return
      // INFO: Ctrl/Cmd+click toggles this point in/out of the active
      // selection (see `click` above) — don't start a drag in that case so
      // the toggle isn't shadowed by an accidental move
      if (event.ctrlKey || event.metaKey) return
      // INFO: temp points (interpolation preview) aren't part of the
      // dataset's points, so there is nothing to move
      if (this.isTemporary) return

      const point = this.datasetRepository.activeDataset.points.find(
        (point: Point) => point.id === this.point.id,
      )
      if (!point) return

      // INFO: stop this from also reaching CanvasMain's own mousedown
      // handler, which would start a rectangle-select drag from the same
      // mouse position
      event.stopPropagation()

      this.datasetRepository.activeDataset.switchActivatedPoint(this.point.id)

      this.dragStartCoord = getMouseCoordFromMouseEvent(event)
      this.dragStartPointCoord = { xPx: point.xPx, yPx: point.yPx }
      this.hasCapturedHistoryForDrag = false
      this.canvasHandler.isDraggingPoint = true

      document.addEventListener('mousemove', this.handleDragMove)
      document.addEventListener('mouseup', this.handleDragEnd)
    },
    handleDragMove(event: MouseEvent) {
      if (!this.dragStartCoord || !this.dragStartPointCoord) return

      const currentCoord = getMouseCoordFromMouseEvent(event)
      const scale = this.canvasHandler.scale
      const deltaXPx = (currentCoord.xPx - this.dragStartCoord.xPx) / scale
      const deltaYPx = (currentCoord.yPx - this.dragStartCoord.yPx) / scale

      if (deltaXPx === 0 && deltaYPx === 0) return

      // INFO: only capture history once movement actually happens, so a
      // plain click (mousedown+mouseup with no movement) doesn't push a
      // no-op snapshot onto the undo stack
      if (!this.hasCapturedHistoryForDrag) {
        this.historyManager.capture()
        this.hasCapturedHistoryForDrag = true
      }

      this.datasetRepository.activeDataset.movePointTo(
        this.point.id,
        this.dragStartPointCoord.xPx + deltaXPx,
        this.dragStartPointCoord.yPx + deltaYPx,
      )

      if (this.interpolator.isActive) {
        this.interpolator.updatePreview()
      }
    },
    handleDragEnd() {
      this.dragStartCoord = null
      this.dragStartPointCoord = null
      this.hasCapturedHistoryForDrag = false
      this.canvasHandler.isDraggingPoint = false

      document.removeEventListener('mousemove', this.handleDragMove)
      document.removeEventListener('mouseup', this.handleDragEnd)
    },
  },
})
</script>
