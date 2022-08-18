import { Actions, Getters, Module, createMapper } from 'vuex-smart-module'
import { Magnifier } from '@/domains/magnifier'

class state {
  magnifier = new Magnifier()
}

class getters extends Getters<state> {
  get magnifier(): Magnifier {
    return this.state.magnifier
  }
}

class actions extends Actions<state, getters> {
  setScale(scale: number): void {
    this.state.magnifier.setScale(scale)
  }
}

export const magnifier = new Module({
  state,
  actions,
  getters,
})

export const magnifierMapper = createMapper(magnifier)
