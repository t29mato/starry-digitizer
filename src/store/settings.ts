import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    isInterpolatorEnabled: false,
    //TODO: pointMode, manualMode, maskModeなども新仕様に合わせてここで管理する
  }),
})
