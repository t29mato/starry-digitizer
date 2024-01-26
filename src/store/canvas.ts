//TODO: remove this file after replacing this with domain repository

import { defineStore } from 'pinia'
import { Canvas } from '@/application/services/canvas/canvas'
import { Coord } from '@/domain/datasetInterface'

// export interface State {
//   canvas: CanvasInterface
// }

const canvas = Canvas.getInstance()

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    canvas: canvas,
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // canvas() {
    //   return this.canvas
    // },
  },
  actions: {
    //Emitting many ts errors but this logics will be removed at the end so ignore
    scaleUp() {
      this.canvas.scaleUp()
    },

    scaleDown() {
      this.canvas.scaleDown()
    },

    resizeCanvasToOriginal() {
      this.canvas.drawOriginalSizeImage()
    },

    drawFitSizeImage() {
      this.canvas.drawFitSizeImage()
    },

    drawPenMask(config: { xPx: number; yPx: number; penSize: number }) {
      this.canvas.drawPenMask(config.xPx, config.yPx, config.penSize)
    },

    setCanvasCursor(coord: Coord) {
      this.canvas.cursor = coord
    },

    setPenToolSizePx(size: number) {
      this.canvas.penToolSizePx = size
    },

    setMaskMode(mode: number) {
      this.canvas.maskMode = mode
      this.canvas.manualMode = -1
    },

    setManualMode(mode: number) {
      this.canvas.manualMode = mode
      this.canvas.maskMode = -1
    },

    setEraserSizePx(size: number) {
      this.canvas.eraserSizePx = size
    },

    setUploadImageUrl(url: string) {
      this.canvas.uploadImageUrl = url
    },

    mouseDownOnCanvas(coord: Coord) {
      this.canvas.mouseDown(coord.xPx, coord.yPx)
    },

    mouseDragOnCanvas(coord: Coord) {
      this.canvas.mouseDrag(coord.xPx, coord.yPx)
    },

    mouseUpOnCanvas() {
      this.canvas.mouseUp()
    },
  },
})
