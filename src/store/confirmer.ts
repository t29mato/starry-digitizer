import { Confirmer } from '@/domains/confirmer'
import { defineStore } from 'pinia'

export interface State {
  confirmer: Confirmer
}

export const useConfirmerStore = defineStore('confirmer', {
  state: (): State => ({
    confirmer: new Confirmer(),
  }),
})
