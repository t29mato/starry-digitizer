import {
  Mutations,
  Actions,
  Getters,
  Module,
  createMapper,
} from 'vuex-smart-module'
import { magnifier as MD } from '@/domains/magnifier'

class state {
  magnifier = MD.instance
}

class getters extends Getters<state> {
  get magnifier(): MD {
    return this.state.magnifier
  }
}

class mutations extends Mutations<state> {
  updateMagnifier(newMagnifier: MD): void {
    this.state.magnifier = newMagnifier
  }
}

class actions extends Actions<state, getters, mutations> {
  setScale(scale: number): void {
    MD.instance.setScale(scale)
    this.commit('updateMagnifier', MD.instance)
  }
}

export const magnifier = new Module({
  state,
  mutations,
  actions,
  getters,
})

export const magnifierMapper = createMapper(magnifier)
