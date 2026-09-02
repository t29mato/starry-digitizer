<template>
  <div
    id="canvasWrapper"
    class="c__canvas-wrapper"
    @click="click"
    @mousedown="mouseDown"
    @mouseup="mouseUp"
  >
    <canvas id="imageCanvas"></canvas>
    <canvas
      id="tempMaskCanvas"
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
    ></canvas>
    <canvas
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
      id="maskCanvas"
    ></canvas>
    <canvas
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
      id="interpolationGuideCanvas"
    ></canvas>
    <canvas-axis-set-guide></canvas-axis-set-guide>
    <canvas-axis-set></canvas-axis-set>
    <canvas-points></canvas-points>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
  CanvasAxisSet,
  CanvasPoints,
  CanvasCursor,
  CanvasAxisSetGuide,
} from '.'
import { Vector } from '@/domain/models/axisSet/axisSetInterface'
import { Coord, Point } from '@/@types/types'

import { getMouseCoordFromMouseEvent } from '@/presentation/utils/mouseEventUtilities'
import { getRectCoordsFromDragCoords } from '@/presentation/utils/dragRectangleCalculator'

import { interpolator } from '@/instanceStore/applicationServiceInstances'
import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { confirmer } from '@/instanceStore/applicationServiceInstances'
import { extractor } from '@/instanceStore/applicationServiceInstances'
import { canvasHandler } from '@/instanceStore/applicationServiceInstances'
import { historyManager } from '@/instanceStore/applicationServiceInstances'
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
import { MANUAL_MODE } from '@/constants'

export default defineComponent({
  components: {
    CanvasAxisSet,
    CanvasPoints,
    CanvasCursor,
    CanvasAxisSetGuide,
  },
  props: {
    imagePath: String,
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.keyDownHandler)
    document.removeEventListener('mousemove', this.mouseMove)
  },
  data() {
    return {
      interpolator,
      confirmer,
      extractor,
      canvasHandler,
      historyManager,
      axisSetRepository,
      datasetRepository,
      // INFO: Whether the cursor was inside the image on the previous mousemove.
      // Used to clamp to the edge on the first event after leaving the image
      cursorWasOnImage: false,
    }
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler)
    // INFO: Listen for mousemove on document (instead of the image) so we also catch
    // the event where the cursor crosses the image edge, letting the Magnifier stop right at the edge (#255)
    document.addEventListener('mousemove', this.mouseMove)

    this.interpolator.setGuideCanvas(new HTMLCanvas('interpolationGuideCanvas'))

    if (!this.imagePath) {
      return
    }
    try {
      await this.canvasHandler.initializeImageElement(this.imagePath)
      this.canvasHandler.drawFitSizeImage()
      this.canvasHandler.setUploadImageUrl(this.imagePath)
      this.extractor.setSwatches(this.canvasHandler.colorSwatches)

      //TODO: The interpolation canvas has been delegated to the interpolator app so it's called here, but it should eventually be consolidated into the application that handles the whole canvas initialization sequence
      this.interpolator.resizeCanvas()
    } finally {
      //
    }
  },
  methods: {
    // REFACTOR: Change this to call point or pickColor depending on the mode
    point(e: MouseEvent): void {
      // INFO: View All mode is read-only
      if (this.datasetRepository.isViewAllMode) {
        return
      }
      // IFNO: While in mask drawing mode
      if (this.canvasHandler.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPoint = target.className === 'canvas-point'

      // INFO: Convert the click coordinates to the image's original coordinates
      // (uses the same formula regardless of whether the click target is an existing plot)
      const canvasCoord = getMouseCoordFromMouseEvent(e)
      const xPx = canvasCoord.xPx / this.canvasHandler.scale
      const yPx = canvasCoord.yPx / this.canvasHandler.scale

      // INFO: Ignore clicks outside the image bounds
      if (
        xPx < 0 ||
        yPx < 0 ||
        xPx > this.canvasHandler.originalWidth ||
        yPx > this.canvasHandler.originalHeight
      ) {
        return
      }

      // INFO: When on a canvas-point element, this becomes point edit mode
      switch (this.canvasHandler.manualMode) {
        case 0:
          this.historyManager.capture()
          this.datasetRepository.activeDataset.addPoint(xPx, yPx)
          this.axisSetRepository.activeAxisSet.inactivateAxis()
          this.datasetRepository.activeDataset.addManuallyAddedPointId(
            this.datasetRepository.activeDataset.lastPointId,
          )
          return
        case 1:
          // INFO: CanvasPoint Component -> Click method
          return
        case 2:
          // INFO: CanvasPoint Component -> Click method
          return
        default:
          break
      }
      if (isOnCanvasPoint) {
        return
      }
      if (this.axisSetRepository.activeAxisSet.nextAxis) {
        this.historyManager.capture()
        this.axisSetRepository.activeAxisSet.addAxisCoord({
          xPx,
          yPx,
        })
        this.datasetRepository.activeDataset.inactivatePoints()
        // INFO: Automatically switch to plot-add mode once all axes have been set
        if (!this.axisSetRepository.activeAxisSet.nextAxis) {
          this.canvasHandler.manualMode = MANUAL_MODE.ADD
        }
        return
      }
    },
    click(e: MouseEvent): void {
      if (this.confirmer.isActive) return

      this.point(e)

      if (this.interpolator.isActive) {
        this.interpolator.updatePreview()
      }
    },
    mouseDrag(coord: Coord) {
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseDrag(coord.xPx, coord.yPx)
    },
    // INFO: Bound to document, so this is also called outside canvasWrapper (#255)
    mouseMove(e: MouseEvent) {
      const wrapper = document.getElementById('canvasWrapper')
      if (!wrapper) {
        return
      }

      // INFO: getMouseCoordFromMouseEvent computes coordinates based on imageCanvas's
      // bounding rect, so it works correctly even for events outside canvasWrapper
      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)
      const cursorXPx = xPx / this.canvasHandler.scale
      const cursorYPx = yPx / this.canvasHandler.scale
      const isOnImage =
        cursorXPx >= 0 &&
        cursorYPx >= 0 &&
        cursorXPx <= this.canvasHandler.originalWidth &&
        cursorYPx <= this.canvasHandler.originalHeight

      // INFO: Determine whether the cursor is within canvasWrapper and within the image canvas element's bounds
      const wrapperRect = wrapper.getBoundingClientRect()
      const isInsideWrapper =
        e.clientX >= wrapperRect.left &&
        e.clientX <= wrapperRect.right &&
        e.clientY >= wrapperRect.top &&
        e.clientY <= wrapperRect.bottom
      this.canvasHandler.isCursorOnCanvas = isInsideWrapper && isOnImage

      const isClicking = e.buttons === 1

      // INFO: Don't move the Magnifier outside the image (it's distracting).
      // Only on the first event after leaving the image, update to a position clamped
      // to the edge, so the Magnifier appears to stop exactly at the image edge (#255).
      // During drag (range selection / mask drawing), keep following as an exception
      if (!isOnImage && !isClicking && !this.cursorWasOnImage) {
        return
      }
      this.cursorWasOnImage = isOnImage

      this.axisSetRepository.activeAxisSet.isAdjusting = false
      this.datasetRepository.activeDataset.pointsAreAdjusting = false

      const clampedXPx = Math.min(
        Math.max(cursorXPx, 0),
        this.canvasHandler.originalWidth,
      )
      const clampedYPx = Math.min(
        Math.max(cursorYPx, 0),
        this.canvasHandler.originalHeight,
      )
      this.canvasHandler.setCursor({
        xPx: clampedXPx,
        yPx: clampedYPx,
      })
      if (isClicking) {
        this.mouseDrag({
          xPx: clampedXPx * this.canvasHandler.scale,
          yPx: clampedYPx * this.canvasHandler.scale,
        })
      }
    },
    mouseDown(e: MouseEvent) {
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.canvasHandler.mouseDown(xPx, yPx)
    },
    mouseUp() {
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseUp()

      // INFO: In EDIT mode, select multiple points
      if (this.canvasHandler.manualMode === 1) {
        const rect = this.canvasHandler.rectangle
        const scale = this.canvasHandler.scale

        const { topLeftCoord, bottomRightCoord } = getRectCoordsFromDragCoords(
          { xPx: rect.startX / scale, yPx: rect.startY / scale },
          { xPx: rect.endX / scale, yPx: rect.endY / scale },
        )

        this.datasetRepository.activeDataset.activatePointsInRectangleArea(
          topLeftCoord,
          bottomRightCoord,
        )

        return
      }
    },
    keyDownHandler(e: KeyboardEvent) {
      if (this.confirmer.isActive) return

      // INFO: Undo/Redo is intentionally handled before the isViewAllMode
      // guard below — it's a global action, not a canvas-editing one, and
      // "View All" mode is exactly where you'd want to undo your way back
      // out of a mistake made in a specific dataset.
      if (this.handleHistoryShortcut(e)) {
        return
      }

      if (this.datasetRepository.isViewAllMode) return

      if (!this.shouldProcessKeyEvent(e)) {
        return
      }

      e.preventDefault()
      this.handleKeyEvent(e)
    },
    isTypingTarget(e: KeyboardEvent): boolean {
      const target = e.target as Element

      if (target.hasAttribute('contentEditable')) {
        return true
      }

      const targetName = target.nodeName
      return targetName === 'INPUT' || targetName === 'TEXTAREA'
    },
    handleHistoryShortcut(e: KeyboardEvent): boolean {
      if (this.isTypingTarget(e)) {
        return false
      }
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') {
        return false
      }

      e.preventDefault()
      if (e.shiftKey) {
        this.historyManager.redo()
      } else {
        this.historyManager.undo()
      }
      return true
    },
    shouldProcessKeyEvent(e: KeyboardEvent): boolean {
      // Skip if editing content or in input fields
      if (this.isTypingTarget(e)) {
        return false
      }

      const whiteList = [
        'ArrowUp',
        'ArrowRight',
        'ArrowDown',
        'ArrowLeft',
        'Backspace',
        'Delete',
        'Escape',
        'a',
        'e',
        'd',
      ]

      return whiteList.includes(e.key)
    },
    handleKeyEvent(e: KeyboardEvent) {
      const key = e.key

      // Handle special keys
      if (this.handleSpecialKeys(key, e)) {
        return
      }

      // Handle delete operations
      if (this.handleDeleteKeys(key)) {
        return
      }

      // Handle movement keys
      this.handleMovementKeys(key, e.shiftKey)
    },
    handleSpecialKeys(key: string, e: KeyboardEvent): boolean {
      switch (key) {
        case 'Escape':
          this.datasetRepository.activeDataset.inactivatePoints()
          return true
        case 'a':
          if (e.metaKey || e.ctrlKey) {
            this.datasetRepository.activeDataset.activateAllPoints()
          } else {
            this.canvasHandler.setManualMode(0)
          }
          return true
        case 'e':
          this.canvasHandler.setManualMode(1)
          return true
        case 'd':
          this.canvasHandler.setManualMode(2)
          return true
      }
      return false
    },
    handleDeleteKeys(key: string): boolean {
      if (
        this.datasetRepository.activeDataset.hasActive() &&
        (key === 'Backspace' || key === 'Delete')
      ) {
        this.historyManager.capture()
        this.datasetRepository.activeDataset.clearActivePoints()

        if (this.interpolator.isActive) {
          this.interpolator.updatePreview()
        }

        const lastPointId = this.datasetRepository.activeDataset.lastPointId
        if (lastPointId !== -1) {
          this.datasetRepository.activeDataset.switchActivatedPoint(lastPointId)
        }

        return true
      }
      return false
    },
    handleMovementKeys(key: string, shiftKeyPressed: boolean) {
      const vector: Vector = {
        direction: this.getDirectionFromKey(key),
        distancePx: shiftKeyPressed ? 10 : 1,
      }

      // INFO: only capture history when something is actually about to move
      // — otherwise every stray arrow-key press with nothing selected would
      // push a no-op snapshot onto the undo stack.
      const hasActiveAxis = Boolean(
        this.axisSetRepository.activeAxisSet.activeAxis &&
          this.axisSetRepository.activeAxisSet.activeAxis.coord,
      )
      const hasActivePoints =
        this.datasetRepository.activeDataset.pointsAreActive
      if (hasActiveAxis || hasActivePoints) {
        this.historyManager.capture()
      }

      this.moveActiveAxis(vector)
      this.moveActivePoints(vector)
    },
    moveActiveAxis(vector: Vector) {
      if (
        this.axisSetRepository.activeAxisSet.activeAxis &&
        this.axisSetRepository.activeAxisSet.activeAxis.coord
      ) {
        this.axisSetRepository.activeAxisSet.moveActiveAxis(vector)
        this.canvasHandler.setCursor(
          this.axisSetRepository.activeAxisSet.activeAxis.coord,
        )
      }
    },
    moveActivePoints(vector: Vector) {
      if (this.datasetRepository.activeDataset.pointsAreActive) {
        this.datasetRepository.activeDataset.moveActivePoint(vector)
        this.interpolator.isActive && this.interpolator.updatePreview()

        const activePoints = this.datasetRepository.activeDataset.points.filter(
          (point: Point) =>
            this.datasetRepository.activeDataset.activePointIds.includes(
              point.id,
            ),
        )

        if (activePoints.length > 0) {
          this.canvasHandler.setCursor(activePoints[0])
        }
      }
    },
    getDirectionFromKey(key: string) {
      switch (key) {
        case 'ArrowUp':
          return 'up'
        case 'ArrowDown':
          return 'down'
        case 'ArrowRight':
          return 'right'
        case 'ArrowLeft':
          return 'left'
        default:
          throw new Error(`undefined direction: ${key}`)
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.c {
  &__canvas-wrapper {
    position: relative;
    cursor: crosshair;
    -webkit-user-drag: none;
    outline: solid 1px gray;
    overflow: auto;
    height: 80vh;
  }
}
</style>
@/domain/models/axisSet/AxisSetInterface
@/domain/models/axisSet/axisSetInterface
