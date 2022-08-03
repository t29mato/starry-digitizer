import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { magnifier as md } from '@/domains/magnifier'
import { Plot, Plots } from '@/types'
import { DatasetManager as DatasetDomain } from '@/domains/DatasetManager'

class state {
  magnifierScale = md.instance.magnifierScale
  showSettingsDialog = md.instance.showSettingsDialog
  magnifierSettingError = md.instance.magnifierSettingError
  crosshairSizePx = md.instance.crosshairSizePx
  magnifierSizePx = md.instance.magnifierSizePx
}

class getters extends Getters<state> {
  get magnifierScale() {
    return this.state.magnifierScale
  }
  get showSettingsDialog() {
    return this.state.showSettingsDialog
  }
  get magnifierSettingError() {
    return this.state.magnifierSettingError
  }
  get crosshairSizePx() {
    return this.state.crosshairSizePx
  }
  get magnifierSizePx() {
    return this.state.magnifierSizePx
  }
}

class mutations extends Mutations<state> {
  updateCanvasScale(newScale: number) {
    // this.state.canvasScale = newScale
  }
}

class actions extends Actions<state, getters, mutations> {
  md
  constructor() {
    super()
    this.md = md.instance
  }
}

export const magnifier = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const magnifierMapper = createMapper(magnifier)
