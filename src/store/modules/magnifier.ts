import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { Magnifier } from '@/domains/magnifier'

class state {
  magnifier = new Magnifier()
}

class getters extends Getters<state> {
  get magnifier(): Magnifier {
    return this.state.magnifier
  }
}

class mutations extends Mutations<state> {
  updateMagnifier(newMagnifier: Magnifier): void {
    this.state.magnifier = newMagnifier
  }
}

class actions extends Actions<state, getters, mutations> {
  setScale(scale: number): void {
    this.state.magnifier.setScale(scale)
    this.commit('updateMagnifier', this.state.magnifier)
  }
}

export const magnifier = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const magnifierMapper = createMapper(magnifier)
