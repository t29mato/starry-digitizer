<template>
  <div
    id="canvasWrapper"
    class="c__canvas-wrapper"
    @click="click"
    @mousemove="mouseMove"
    @mousedown="mouseDown"
    @mouseup="mouseUp"
    @mouseenter="mouseEnter"
    @mouseleave="mouseLeave"
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

import { HTMLCanvas } from '@/presentation/dom/HTMLCanvas'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
  ProjectFileOperationResult,
} from '@/application/utils/projectFileOperations'
import { MANUAL_MODE } from '@/constants'

// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

export default defineComponent({
  components: {
    CanvasAxisSet,
    CanvasPoints,
    CanvasCursor,
    CanvasAxisSetGuide,
  },
  emits: ['error'],
  setup() {
    const ctx = useDigitizerContext()
    const options = useDigitizerOptions()
    const { interpolator, confirmer, canvasHandler, historyManager } = ctx
    const { axisSetRepository, datasetRepository } = ctx
    return {
      ctx,
      options,
      interpolator,
      confirmer,
      canvasHandler,
      historyManager,
      axisSetRepository,
      datasetRepository,
    }
  },
  data() {
    return {
      // INFO: keep the exact bound reference so beforeUnmount can remove the
      // very listener that was added (a fresh .bind() would not match).
      boundKeyDownHandler: null as ((e: KeyboardEvent) => void) | null,
    }
  },
  mounted() {
    this.boundKeyDownHandler = this.keyDownHandler.bind(this)
    document.addEventListener('keydown', this.boundKeyDownHandler)

    // INFO: The image itself is loaded by StarryDigitizer.vue through
    // digitizerOperations.applyImage; this component only owns the canvases.
    this.interpolator.setGuideCanvas(new HTMLCanvas('interpolationGuideCanvas'))
  },
  beforeUnmount() {
    if (this.boundKeyDownHandler) {
      document.removeEventListener('keydown', this.boundKeyDownHandler)
      this.boundKeyDownHandler = null
    }
  },
  methods: {
    // REFACTOR: modeに応じてpointなりpickColorなりを呼び出す形に変更する
    point(e: MouseEvent): void {
      // INFO: readonly option and View All mode are both view-only
      if (this.options.readonly || this.datasetRepository.isViewAllMode) {
        return
      }
      // IFNO: マスク描画モード中につき
      if (this.canvasHandler.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPoint = target.className === 'canvas-point'

      // INFO: クリック座標を画像のオリジナル座標に変換
      const xPx = isOnCanvasPoint
        ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
          this.canvasHandler.scale
        : (e.offsetX - offsetPx) / this.canvasHandler.scale
      const yPx = isOnCanvasPoint
        ? (e.offsetY + parseFloat(target.style.top)) / this.canvasHandler.scale
        : e.offsetY / this.canvasHandler.scale

      // INFO: 画像範囲外のクリックを無視する
      if (
        xPx < 0 ||
        yPx < 0 ||
        xPx > this.canvasHandler.originalWidth ||
        yPx > this.canvasHandler.originalHeight
      ) {
        return
      }

      // INFO: canvas-point element上の時は、point edit modeになるので
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
        // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
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
      // INFO: dragging draws masks / selection rectangles, so it is an edit.
      if (this.options.readonly) return
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseDrag(coord.xPx, coord.yPx)
    },
    mouseMove(e: MouseEvent) {
      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      // INFO: カーソルが画像canvas要素の範囲内かどうかを判定
      const cursorXPx = xPx / this.canvasHandler.scale
      const cursorYPx = yPx / this.canvasHandler.scale
      this.canvasHandler.isCursorOnCanvas =
        cursorXPx >= 0 &&
        cursorYPx >= 0 &&
        cursorXPx <= this.canvasHandler.originalWidth &&
        cursorYPx <= this.canvasHandler.originalHeight

      this.axisSetRepository.activeAxisSet.isAdjusting = false
      this.datasetRepository.activeDataset.pointsAreAdjusting = false
      this.canvasHandler.setCursor({
        xPx: cursorXPx,
        yPx: cursorYPx,
      })
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (isClicking) {
        this.mouseDrag({ xPx, yPx })
      }
    },
    mouseEnter() {
      // INFO: 正確な判定はmouseMoveで行うが、初期値としてtrueにする
      this.canvasHandler.isCursorOnCanvas = true
    },
    mouseLeave() {
      this.canvasHandler.isCursorOnCanvas = false
    },
    mouseDown(e: MouseEvent) {
      if (this.options.readonly) return
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.canvasHandler.mouseDown(xPx, yPx)
    },
    mouseUp() {
      if (this.options.readonly) return
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseUp()

      // INFO: EDITモードの場合にpointの複数選択を行う
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

      // INFO: Undo/Redo, File (save/load), and zoom are intentionally
      // handled before the isViewAllMode guard below — they're global
      // actions/view controls, not canvas-editing ones, and should keep
      // working even while "View All" mode is showing every dataset at
      // once (undo is exactly how you'd back out of a mistake from there).
      if (this.handleHistoryShortcut(e)) {
        return
      }

      if (this.handleFileShortcut(e)) {
        return
      }

      if (this.handleZoomShortcut(e)) {
        return
      }

      if (this.datasetRepository.isViewAllMode) return

      // INFO: the remaining shortcuts all edit points/axes.
      if (this.options.readonly) return

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
      // INFO: undo/redo replay edits, so they are disabled in readonly mode.
      if (this.options.readonly) {
        return false
      }
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
    handleFileShortcut(e: KeyboardEvent): boolean {
      // INFO: ZIP save/load is an optional feature of the embedded digitizer.
      if (!this.options.features.zipExportImport) {
        return false
      }
      if (this.isTypingTarget(e)) {
        return false
      }
      if (!(e.metaKey || e.ctrlKey)) {
        return false
      }

      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        this.runProjectFileOperation(saveProjectAndDownload(this.ctx))
        return true
      }
      // INFO: loading a project overwrites the current state, so it is an
      // edit and stays disabled in readonly mode (saving stays available).
      if (key === 'o' && !this.options.readonly) {
        e.preventDefault()
        this.runProjectFileOperation(triggerLoadProjectDialog(this.ctx))
        return true
      }
      return false
    },
    async runProjectFileOperation(
      operation: Promise<ProjectFileOperationResult>,
    ): Promise<void> {
      const result = await operation
      if (!result.success && result.errorMessage) {
        this.$emit('error', result.error ?? new Error(result.errorMessage))
      }
    },
    // INFO: No modifier key here (mirrors the 'a'/'e'/'d' mode-switch keys
    // below) since Cmd/Ctrl+Plus/Minus/0 are reserved by the browser itself
    // for page zoom and can't be overridden from a web page.
    handleZoomShortcut(e: KeyboardEvent): boolean {
      if (this.isTypingTarget(e)) {
        return false
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return false
      }

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault()
          this.canvasHandler.scaleUp()
          this.interpolator.resizeCanvas()
          return true
        case '-':
          e.preventDefault()
          this.canvasHandler.scaleDown()
          this.interpolator.resizeCanvas()
          return true
        case '0':
          e.preventDefault()
          this.canvasHandler.drawOriginalSizeImage()
          this.interpolator.resizeCanvas()
          return true
        case 'f':
        case 'F':
          e.preventDefault()
          this.canvasHandler.drawFitSizeImage()
          this.interpolator.resizeCanvas()
          return true
        default:
          return false
      }
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
