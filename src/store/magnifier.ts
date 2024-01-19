import { defineStore } from 'pinia'
import { Magnifier } from '@/domain/magnifier'

export interface State {
  magnifier: Magnifier
}

export const useMagnifierStore = defineStore('magnifier', {
  state: (): State => ({
    magnifier: new Magnifier(),
  }),
  getters: {
    //MEMO: Piniaでこの書き方だと循環参照してしまう。そもそも不要？
    // magnifier() {
    //   return this.magnifier
    // },
  },
  actions: {
    setScale(scale: number): void {
      this.magnifier.setScale(scale)
    },
  },
})
