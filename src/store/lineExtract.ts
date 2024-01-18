import { defineStore } from 'pinia'
import LineExtract from '@/applications/strategies/extractStrategies/lineExtract'

export interface State {
  lineExtract: LineExtract
}

export const useLineExtractStore = defineStore('lineExtract', {
  state: (): State => ({
    lineExtract: LineExtract.instance,
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // lineExtract() {
    //   return this.lineExtract
    // },
  },
  actions: {
    setDyPx(dyPx: number) {
      this.lineExtract.dyPx = dyPx
    },
    setDxPx(dxPx: number) {
      this.lineExtract.dxPx = dxPx
    },
  },
})
