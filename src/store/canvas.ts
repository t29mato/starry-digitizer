import { defineStore } from 'pinia'
import { Canvas } from '@/domains/canvas'
import { Coord } from '@/domains/datasetInterface'

// export interface State {
//   canvas: CanvasInterface
// }

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    canvas: new Canvas(),
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // canvas() {
    //   return this.canvas
    // },
  },
  actions: {
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

    mouseMoveForPen(config: { xPx: number; yPx: number; penSize: number }) {
      this.canvas.mouseMoveForPen(config.xPx, config.yPx, config.penSize)
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

    mouseDragOnCanvas(coord: Coord) {
      this.canvas.mouseDrag(coord.xPx, coord.yPx)
    },
  },
})
