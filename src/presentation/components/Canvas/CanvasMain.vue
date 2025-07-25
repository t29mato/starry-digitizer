<template>
  <div
    id="canvasWrapper"
    class="c__canvas-wrapper"
    @click="click"
    @mousemove="mouseMove"
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
import { axisSetRepository } from '@/instanceStore/repositoryInatances'
import { datasetRepository } from '@/instanceStore/repositoryInatances'
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
  props: {
    imagePath: String,
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.keyDownHandler)
  },
  data() {
    return {
      interpolator,
      confirmer,
      extractor,
      canvasHandler,
      axisSetRepository,
      datasetRepository,
    }
  },
  async mounted() {
    document.addEventListener('keydown', this.keyDownHandler.bind(this))

    this.interpolator.setGuideCanvas(new HTMLCanvas('interpolationGuideCanvas'))

    if (!this.imagePath) {
      return
    }
    try {
      await this.canvasHandler.initializeImageElement(this.imagePath)
      this.canvasHandler.drawFitSizeImage()
      this.canvasHandler.setUploadImageUrl(this.imagePath)
      this.extractor.setSwatches(this.canvasHandler.colorSwatches)

      //TODO: interpolation canvasをinterpolator appに移譲したのでここで呼んでいるがcanvas初期化一連を行うapplicationにまとめたい
      this.interpolator.resizeCanvas()
    } finally {
      //
    }
  },
  methods: {
    // REFACTOR: modeに応じてpointなりpickColorなりを呼び出す形に変更する
    point(e: MouseEvent): void {
      // IFNO: マスク描画モード中につき
      if (this.canvasHandler.isDrawingMask) {
        return
      }
      const target = e.target as HTMLElement
      const isOnCanvasPoint = target.className === 'canvas-point'
      // INFO: canvas-point element上の時は、point edit modeになるので
      switch (this.canvasHandler.manualMode) {
        case 0:
          this.datasetRepository.activeDataset.addPoint(
            isOnCanvasPoint
              ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
                  this.canvasHandler.scale
              : (e.offsetX - offsetPx) / this.canvasHandler.scale,
            isOnCanvasPoint
              ? (e.offsetY + parseFloat(target.style.top)) /
                  this.canvasHandler.scale
              : e.offsetY / this.canvasHandler.scale,
          )
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
        this.axisSetRepository.activeAxisSet.addAxisCoord({
          xPx: (e.offsetX - offsetPx) / this.canvasHandler.scale,
          yPx: e.offsetY / this.canvasHandler.scale,
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
      if (this.confirmer.isActive) return

      this.canvasHandler.mouseDrag(coord.xPx, coord.yPx)
    },
    mouseMove(e: MouseEvent) {
      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.axisSetRepository.activeAxisSet.isAdjusting = false
      this.datasetRepository.activeDataset.pointsAreAdjusting = false
      this.canvasHandler.setCursor({
        xPx: xPx / this.canvasHandler.scale,
        yPx: yPx / this.canvasHandler.scale,
      })
      // INFO: 左クリックされていない状態
      const isClicking = e.buttons === 1
      if (isClicking) {
        this.mouseDrag({ xPx, yPx })
      }
    },
    mouseDown(e: MouseEvent) {
      if (this.confirmer.isActive) return

      const { xPx, yPx } = getMouseCoordFromMouseEvent(e)

      this.canvasHandler.mouseDown(xPx, yPx)
    },
    mouseUp() {
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

      if (!this.shouldProcessKeyEvent(e)) {
        return
      }

      e.preventDefault()
      this.handleKeyEvent(e)
    },
    shouldProcessKeyEvent(e: KeyboardEvent): boolean {
      const target = e.target as Element

      // Skip if editing content
      if (target.hasAttribute('contentEditable')) {
        return false
      }

      // Skip if in input fields
      const targetName = target.nodeName
      if (targetName === 'INPUT' || targetName === 'TEXTAREA') {
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
