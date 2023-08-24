import { Module } from 'vuex'
import { Canvas } from '@/domains/canvas'
import { Coord } from '@/domains/datasetInterface'

interface State {
  canvas: Canvas
}

const state: State = {
  canvas: new Canvas(),
}

const getters = {
  canvas: (state: State) => state.canvas,
}

const mutations = {
  // Mutations if any
}

const actions = {
  scaleUp({ state }: { state: State }) {
    state.canvas.scaleUp()
  },

  scaleDown({ state }: { state: State }) {
    state.canvas.scaleDown()
  },

  resizeCanvasToOriginal({ state }: { state: State }) {
    state.canvas.drawOriginalSizeImage()
  },

  drawFitSizeImage({ state }: { state: State }) {
    state.canvas.drawFitSizeImage()
  },

  mouseMoveForPen(
    { state }: { state: State },
    config: { xPx: number; yPx: number; penSize: number }
  ) {
    state.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
  },

  setCanvasCursor({ state }: { state: State }, coord: Coord) {
    state.canvas.cursor = coord
  },

  setPenToolSizePx({ state }: { state: State }, size: number) {
    state.canvas.penToolSizePx = size
  },

  setMaskMode({ state }: { state: State }, mode: number) {
    state.canvas.maskMode = mode
    state.canvas.manualMode = -1
  },

  setManualMode({ state }: { state: State }, mode: number) {
    state.canvas.manualMode = mode
    state.canvas.maskMode = -1
  },

  setEraserSizePx({ state }: { state: State }, size: number) {
    state.canvas.eraserSizePx = size
  },

  setUploadImageUrl({ state }: { state: State }, url: string) {
    state.canvas.uploadImageUrl = url
  },

  mouseMoveOnCanvas({ state }: { state: State }, coord: Coord) {
    state.canvas.mouseMove(coord.xPx, coord.yPx)
  },
}

export const canvas: Module<State, any> = {
  state,
  getters,
  mutations,
  actions,
}
