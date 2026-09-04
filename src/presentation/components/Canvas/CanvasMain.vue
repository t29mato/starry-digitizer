<template>
  <div
    id="canvasWrapper"
    ref="canvasWrapper"
    class="c__canvas-wrapper"
    @click="click"
    @mousedown="mouseDown"
    @mouseup="mouseUp"
  >
    <canvas id="imageCanvas" ref="imageCanvas"></canvas>
    <canvas
      id="tempMaskCanvas"
      ref="tempMaskCanvas"
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
      ref="maskCanvas"
    ></canvas>
    <canvas
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0.5,
      }"
      id="interpolationGuideCanvas"
      ref="interpolationGuideCanvas"
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

import { HTMLCanvas } from '@/application/canvas/HTMLCanvas'
import { useDigitizerContext } from '@/application/digitizerContext'
import { useDigitizerOptions } from '@/presentation/digitizerOptions'
import { ProjectFileOperationResult } from '@/application/utils/projectFileOperations'
import {
  saveProjectAndDownload,
  triggerLoadProjectDialog,
} from '@/presentation/utils/projectFileDialog'
import { MANUAL_MODE } from '@/constants'

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
      boundMouseMoveHandler: null as ((e: MouseEvent) => void) | null,
      // INFO: whether the cursor was inside the image on the previous
      // mousemove. Used to clamp the magnifier to the edge on the first event
      // that leaves the image.
      cursorWasOnImage: false,
      // INFO: true while a drag that STARTED on this instance's wrapper is in
      // progress. mousemove is a document listener (see mounted), so on a page
      // with more than one <StarryDigitizer> every instance sees every move;
      // this tells them apart.
      isDraggingHere: false,
    }
  },
  mounted() {
    this.boundKeyDownHandler = this.keyDownHandler.bind(this)
    document.addEventListener('keydown', this.boundKeyDownHandler)
    // INFO: mousemove is listened for on document (not on the wrapper) so the
    // event that crosses the image edge is still received and the magnifier
    // can be stopped exactly at the edge (#255).
    this.boundMouseMoveHandler = this.mouseMove.bind(this)
    document.addEventListener('mousemove', this.boundMouseMoveHandler)

    // INFO: The image itself is loaded by StarryDigitizer.vue through
    // digitizerOperations.applyImage; this component only owns the canvases.
    // They are handed to the engine explicitly (rather than looked up by id)
    // so that several <StarryDigitizer> instances can share a page.
    this.canvasHandler.attachCanvases({
      wrapper: this.$refs.canvasWrapper as HTMLDivElement,
      imageCanvas: this.$refs.imageCanvas as HTMLCanvasElement,
      maskCanvas: this.$refs.maskCanvas as HTMLCanvasElement,
      tempMaskCanvas: this.$refs.tempMaskCanvas as HTMLCanvasElement,
    })
    this.interpolator.setGuideCanvas(
      new HTMLCanvas(this.$refs.interpolationGuideCanvas as HTMLCanvasElement),
    )
  },
  beforeUnmount() {
    if (this.boundKeyDownHandler) {
      document.removeEventListener('keydown', this.boundKeyDownHandler)
      this.boundKeyDownHandler = null
    }
    if (this.boundMouseMoveHandler) {
      document.removeEventListener('mousemove', this.boundMouseMoveHandler)
      this.boundMouseMoveHandler = null
    }
    this.canvasHandler.detachCanvases([
      'wrapper',
      'imageCanvas',
      'maskCanvas',
      'tempMaskCanvas',
    ])
  },
  methods: {
    // INFO: the element this component owns via a template ref — passed to
    // getMouseCoordFromMouseEvent instead of an id lookup so that several
    // digitizer instances can share a page. Undefined before mount / after
    // unmount, in which case the util falls back to offsetX/Y.
    imageCanvasElement(): HTMLCanvasElement | undefined {
      return this.$refs.imageCanvas as HTMLCanvasElement | undefined
    },
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
      // (クリック対象が既存プロット上かどうかに関わらず同じ計算式を使う)
      const canvasCoord = getMouseCoordFromMouseEvent(
        e,
        this.imageCanvasElement(),
      )
      const xPx = canvasCoord.xPx / this.canvasHandler.scale
      const yPx = canvasCoord.yPx / this.canvasHandler.scale

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
          this.canvasHandler.setManualMode(MANUAL_MODE.ADD)
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
    // INFO: bound to document, so this also fires outside canvasWrapper (#255)
    mouseMove(e: MouseEvent) {
      const wrapper = this.$refs.canvasWrapper as HTMLDivElement | undefined
      if (!wrapper) {
        return
      }

      // INFO: getMouseCoordFromMouseEvent is relative to the image canvas'
      // bounding rect, so it stays correct for events outside canvasWrapper.
      const { xPx, yPx } = getMouseCoordFromMouseEvent(
        e,
        this.imageCanvasElement(),
      )
      const cursorXPx = xPx / this.canvasHandler.scale
      const cursorYPx = yPx / this.canvasHandler.scale
      const isOnImage =
        cursorXPx >= 0 &&
        cursorYPx >= 0 &&
        cursorXPx <= this.canvasHandler.originalWidth &&
        cursorYPx <= this.canvasHandler.originalHeight

      // INFO: カーソルがcanvasWrapper内かつ画像canvas要素の範囲内かどうかを判定
      const wrapperRect = wrapper.getBoundingClientRect()
      const isInsideWrapper =
        e.clientX >= wrapperRect.left &&
        e.clientX <= wrapperRect.right &&
        e.clientY >= wrapperRect.top &&
        e.clientY <= wrapperRect.bottom
      this.canvasHandler.setIsCursorOnCanvas(isInsideWrapper && isOnImage)

      // INFO: 左クリックされている状態
      const isClicking = e.buttons === 1

      // INFO: the listener is on document (#255), so every instance on the
      // page receives this event. Another instance's image can easily cover
      // the same coordinates, so "is the cursor over MY wrapper" is the check
      // that tells them apart — `isOnImage` alone is not enough.
      if (!isInsideWrapper && !this.isDraggingHere && !this.cursorWasOnImage) {
        return
      }

      // INFO: 画像の外ではMagnifierを動かさない(気が散るため)。
      // 画像から出た最初のイベントだけは端にクランプした位置へ更新し、
      // Magnifierが画像の端でぴったり止まって見えるようにする (#255)。
      // ドラッグ中(範囲選択・マスク描画)は例外として追従を続ける
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
      if (this.options.readonly) return
      if (this.datasetRepository.isViewAllMode) return
      if (this.confirmer.isActive) return

      // INFO: bound on the wrapper, so it only fires for this instance.
      this.isDraggingHere = true

      const { xPx, yPx } = getMouseCoordFromMouseEvent(
        e,
        this.imageCanvasElement(),
      )

      this.canvasHandler.mouseDown(xPx, yPx)
    },
    mouseUp() {
      this.isDraggingHere = false
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
    // INFO: the height must stay definite — canvasHandler.drawFitSizeImage()
    // reads offsetHeight to compute the fit scale, so a content-driven height
    // would be circular. `flex: 1 1 auto` keeps that basis while letting the
    // wrapper shrink or grow when the host gives .starry-digitizer a height
    // (--sd-height), which is what makes a 100dvh embed work.
    flex: 1 1 auto;
    height: var(--sd-canvas-height, 80vh);
    min-height: var(--sd-canvas-min-height, 240px);
  }
}
</style>
@/domain/models/axisSet/AxisSetInterface
@/domain/models/axisSet/axisSetInterface
