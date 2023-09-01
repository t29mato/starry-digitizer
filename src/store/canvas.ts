import { defineStore } from 'pinia'
import { Canvas } from '@/domains/canvas'
import { Coord } from '@/domains/datasetInterface'

interface State {
  canvas: Canvas
}

export const useCanvasStore = defineStore('canvas', {
  state: (): State => ({
    canvas: new Canvas(),
  }),
  getters: {
    canvas: (state: State) => state.canvas,
  },
  actions: {
    scaleUp(state: State) {
      state.canvas.scaleUp()
    },

    scaleDown(state: State) {
      state.canvas.scaleDown()
    },

    resizeCanvasToOriginal(state: State) {
      state.canvas.drawOriginalSizeImage()
    },

    drawFitSizeImage(state: State) {
      state.canvas.drawFitSizeImage()
    },

    mouseMoveForPen(
      state: State,
      config: { xPx: number; yPx: number; penSize: number },
    ) {
      state.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
    },

    setCanvasCursor(state: State, coord: Coord) {
      state.canvas.cursor = coord
    },

    setPenToolSizePx(state: State, size: number) {
      state.canvas.penToolSizePx = size
    },

    setMaskMode(state: State, mode: number) {
      state.canvas.maskMode = mode
      state.canvas.manualMode = -1
    },

    setManualMode(state: State, mode: number) {
      state.canvas.manualMode = mode
      state.canvas.maskMode = -1
    },

    setEraserSizePx(state: State, size: number) {
      state.canvas.eraserSizePx = size
    },

    setUploadImageUrl(state: State, url: string) {
      state.canvas.uploadImageUrl = url
    },

    mouseMoveOnCanvas(state: State, coord: Coord) {
      state.canvas.mouseMove(coord.xPx, coord.yPx)
    },
  },
})
