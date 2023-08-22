import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { Canvas } from '@/domains/canvas'
import { Coord } from '@/domains/datasetInterface'

// State composition
const state = ref({
  canvas: new Canvas(),
})

// Getters composition
const getters = {
  canvas: computed(() => state.value.canvas),
  colorSwatches: computed(() => state.value.canvas.colorSwatches),
  maskMode: computed(() => state.value.canvas.maskMode),
}

// Actions composition
const actions = {
  scaleUp() {
    state.value.canvas.scaleUp()
  },
  scaleDown() {
    state.value.canvas.scaleDown()
  },
  resizeCanvasToOriginal() {
    state.value.canvas.drawOriginalSizeImage()
  },
  drawFitSizeImage() {
    state.value.canvas.drawFitSizeImage()
  },
  mouseMoveForPen(config: { xPx: number; yPx: number; penSize: number }) {
    state.value.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
  },
  setCanvasCursor(coord: Coord) {
    state.value.canvas.cursor = coord
  },
  setPenToolSizePx(size: number) {
    state.value.canvas.penToolSizePx = size
  },
  setMaskMode(mode: number) {
    state.value.canvas.maskMode = mode
    state.value.canvas.manualMode = -1
  },
  setManualMode(mode: number) {
    state.value.canvas.manualMode = mode
    state.value.canvas.maskMode = -1
  },
  setEraserSizePx(size: number) {
    state.value.canvas.eraserSizePx = size
  },
  setUploadImageUrl(url: string) {
    state.value.canvas.uploadImageUrl = url
  },
  mouseMoveOnCanvas(coord: Coord) {
    state.value.canvas.mouseMove(coord.xPx, coord.yPx)
  },
  changeImage(imageElement: HTMLImageElement) {
    state.value.canvas.changeImage(imageElement)
  },
  clearMask() {
    state.value.canvas.clearMask()
  },
  initialize(path: string) {
    state.value.canvas.initialize(path)
  },
}

// Export the composed store instance
export const useCanvasStore = () => {
  const store = useStore()
  return {
    ...getters,
    ...actions,
  }
}
