import Vue from 'vue'
import Vuex from 'vuex'
import { canvas } from './modules/canvas'
import { dataset } from './modules/dataset'
import { createStore, Module } from 'vuex-smart-module'

Vue.use(Vuex)

const module = new Module({
  modules: {
    canvas,
    dataset,
  },
})

const store = createStore(module)
export default store
