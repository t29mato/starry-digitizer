<template>
  <div
    :style="{
      position: 'relative',
      cursor: 'crosshair',
      'user-drag': 'none',
      outline: 'solid 1px grey',
      overflow: 'auto',
      'max-height': '80vh',
    }"
    id="canvasWrapper"
    @click="plot"
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
    <canvas-axes-guide></canvas-axes-guide>
    <canvas-axes></canvas-axes>
    <canvas-plots></canvas-plots>
    <canvas-cursor></canvas-cursor>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { useCanvasStore } from '@/store/modules/canvas'
import { useAxesStore } from '@/store/modules/axes'
import { useDatasetStore } from '@/store/modules/dataset'
import { useExtractorStore } from '@/store/modules/extractor'
import { CanvasAxes, CanvasPlots, CanvasCursor, CanvasAxesGuide } from '.'
import { Vector } from '@/domains/axes/axesInterface'
import { Coord, Plot } from '@/domains/datasetInterface'
// INFO: to adjust the exact position the user clicked.
const offsetPx = 1

const canvasStore = useCanvasStore()
const axesStore = useAxesStore()
const datasetStore = useDatasetStore()
const extractorStore = useExtractorStore()

const imagePath = ref('')
// const sortKey = ref('as added')
// const sortKeys = ref(['as added', 'x', 'y'])
// const sortOrder = ref('ascending')
// const sortOrders = ref(['ascending', 'descending'])

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyDownHandler)
})

// const canvas = computed(() => canvasStore.canvas.value)
const axes = computed(() => axesStore.axes.value)
const datasets = computed(() => datasetStore.datasets.value)

onMounted(async () => {
  document.addEventListener('keydown', keyDownHandler)

  if (!imagePath.value) {
    return
  }
  try {
    await canvasStore.initialize(imagePath.value)
    drawFitSizeImage()
    setUploadImageUrl(imagePath.value)
    setSwatches(canvasStore.colorSwatches.value)
  } finally {
    //
  }
})

function drawFitSizeImage() {
  canvasStore.drawFitSizeImage()
}

function setUploadImageUrl(path: string) {
  canvasStore.setUploadImageUrl(path)
}

function setSwatches(swatches: string[]) {
  extractorStore.setSwatches(swatches)
}

function addPlot(coord: Coord) {
  datasetStore.addPlot(coord)
}

function inactivateAxis() {
  axesStore.inactivateAxis()
}

function addAxisCoord(coord: Coord) {
  axesStore.addAxisCoord(coord)
}

function inactivatePlots() {
  datasetStore.inactivatePlots()
}

function setManualMode(mode: number) {
  canvasStore.setManualMode(mode)
}

function moveActiveAxis(vector: Vector) {
  axesStore.moveActiveAxis(vector)
}

function moveActivePlot(vector: Vector) {
  datasetStore.moveActivePlot(vector)
}

function clearActivePlots() {
  datasetStore.clearActivePlots()
}

function keyDownHandler(e: KeyboardEvent) {
  const target = e.target as Element
  // INFO: 編集可能HTMLにカーソルが当たってる場合はスルー
  if (target.hasAttribute('contentEditable')) {
    return
  }
  // INFO: 入力フィールドにカーソルが当たってる場合はスルー
  const targetName = target.nodeName
  if (targetName === 'INPUT' || targetName === 'TEXTAREA') {
    return
  }
  const whiteList = [
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
    'Backspace',
    'Delete',
    'a',
    'e',
    'd',
  ]
  const key = e.key
  if (!whiteList.includes(key)) {
    return
  }
  e.preventDefault()
  switch (key) {
    case 'a':
      setManualMode(0)
      return
    case 'e':
      setManualMode(1)
      return
    case 'd':
      setManualMode(2)
      return
  }
  if (datasets.value.activeDataset.hasActive()) {
    if (key === 'Backspace' || key === 'Delete') {
      clearActivePlots()
    }
  }
  const shiftKeyIsPressed = e.shiftKey
  const vector: Vector = {
    direction: getDirectionFromKey(key),
    distancePx: shiftKeyIsPressed ? 10 : 1,
  }
  if (axes.value.activeAxis && axes.value.activeAxis.coord) {
    moveActiveAxis(vector)
    setCanvasCursor(axes.value.activeAxis.coord)
  }
  if (datasets.value.activeDataset.plotsAreActive) {
    moveActivePlot(vector)
    setCanvasCursor(
      datasets.value.activeDataset.plots.filter((plot: Plot) =>
        datasets.value.activeDataset.activePlotIds.includes(plot.id)
      )[0]
    )
  }
}

function mouseMoveOnCanvas(coord: Coord) {
  canvasStore.mouseMoveOnCanvas(coord)
}

function setCanvasCursor(coord: Coord) {
  canvasStore.setCanvasCursor(coord)
}

// function mouseDownForBox(xPx: number, yPx: number) {
//   canvasStore.canvas.value.mouseDownForBox(xPx, yPx)
// }

// function mouseUpForBox() {
//   canvasStore.canvas.value.mouseUpForBox()
// }

function plot(e: MouseEvent) {
  const target = e.target as HTMLElement
  const isOnCanvasPlot = target.className === 'canvas-plot'
  // INFO: canvas-plot element上の時は、plot edit modeになるので
  switch (canvasStore.canvas.value.manualMode) {
    case 0:
      addPlot({
        xPx: isOnCanvasPlot
          ? (e.offsetX + parseFloat(target.style.left) - offsetPx) /
            canvasStore.canvas.value.scale
          : (e.offsetX - offsetPx) / canvasStore.canvas.value.scale,
        yPx: isOnCanvasPlot
          ? (e.offsetY + parseFloat(target.style.top)) /
            canvasStore.canvas.value.scale
          : e.offsetY / canvasStore.canvas.value.scale,
      })
      inactivateAxis()
      return
    case 1:
      // INFO: CanvasPlot Component -> Click method
      return
    case 2:
      // INFO: CanvasPlot Component -> Click method
      return
    default:
      break
  }
  if (isOnCanvasPlot) {
    return
  }
  if (axesStore.axes.value.nextAxis) {
    addAxisCoord({
      xPx: (e.offsetX - offsetPx) / canvasStore.canvas.value.scale,
      yPx: e.offsetY / canvasStore.canvas.value.scale,
    })
    inactivatePlots()
    // INFO: 軸を全て設定し終えた後は自動でプロット追加モードにする
    if (!axesStore.axes.value.nextAxis) {
      setManualMode(0)
    }
    return
  }
}

function mouseMove(e: MouseEvent) {
  const target = e.target as HTMLElement
  const xPx = e.offsetX - offsetPx + parseFloat(target.style.left)
  const yPx = e.offsetY + parseFloat(target.style.top)
  axesStore.axes.value.isAdjusting = false
  datasets.value.activeDataset.plotsAreAdjusting = false
  setCanvasCursor({
    xPx: xPx / canvasStore.canvas.value.scale,
    yPx: yPx / canvasStore.canvas.value.scale,
  })
  const isClicking = e.buttons === 1
  if (isClicking) {
    mouseDrag({ xPx, yPx })
  }
}

function mouseDrag(coord: Coord) {
  mouseMoveOnCanvas(coord)
}

function getDirectionFromKey(key: string) {
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
}

// function convertToCsv(data: string[][]) {
//   const rows = data.map((row) => row.join(','))
//   return rows.join('\n')
// }

// function copyData() {
//   const data = tableData.value
//   const values = data.slice(0)
//   const csv = convertToCsv(values)
//   navigator.clipboard
//     .writeText(csv)
//     .then(() => console.log('Copy successful.'))
//     .catch((err) => console.error('Copy failed.', err))
// }

// const tableData = computed(() => {
//   if (datasets.value.activeDataset.plots.length > 0) {
//     return datasets.value.activeDataset.plots.map((plot: Plot) => {
//       const { xV, yV } = calculateXY(plot.xPx, plot.yPx)
//       return {
//         X: xV,
//         Y: yV,
//       }
//     })
//   }
//   return [{ X: null, Y: null }]
// })

// function calculateXY(x: number, y: number): { xV: string; yV: string } {
//   const calculator = new XYAxesCalculator(axes.value, {
//     x: axes.value.xIsLog,
//     y: axes.value.yIsLog,
//   })
//   return calculator.calculateXYValues(x, y)
// }
</script>
