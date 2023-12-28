import { defineStore } from 'pinia'

export interface State {
  plotSizePx: number
  tempPlotSizePx: number
  axisSizePx: number
  plotOpacity: number
  tempPlotOpacity: number
}

export const useStyleStore = defineStore('style', {
  state: (): State => ({
    plotSizePx: 10,
    tempPlotSizePx: 8,
    axisSizePx: 20,
    plotOpacity: 0.7,
    tempPlotOpacity: 0.4,
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // plotSizePx(): number {
    //   return this.plotSizePx
    // },
    // axisSizePx(): number {
    //   return this.axisSizePx
    // },
    axisHalfSizePx(): number {
      return this.axisSizePx / 2
    },
    axisCrossBorderPx(): number {
      return this.axisSizePx * 0.1
    },
    axisCrossBorderHalfPx(): number {
      return this.axisCrossBorderPx * 0.5
    },
    axisCrossTopPx(): number {
      return (this.axisSizePx - this.axisCrossBorderPx) / 2
    },
    axisCrossCursorPx(): number {
      return this.axisSizePx * 0.7
    },
  },
  actions: {
    //moved from mutations
    updatePlotSizePx(newPlotSizePx: number) {
      this.plotSizePx = newPlotSizePx
    },
    //moved from mutations
    updateAxisSizePx(newAxisSizePx: number) {
      this.axisSizePx = newAxisSizePx
    },
    setPlotSizePx(size: number) {
      this.updatePlotSizePx(size)
    },
    setAxisSizePx(size: number) {
      this.updateAxisSizePx(size)
    },
  },
})
