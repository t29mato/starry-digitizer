import Vue from 'vue'
import Vuex from 'vuex'
import { canvas } from './modules/canvas'
import { dataset } from './modules/dataset'
import { magnifier } from './modules/magnifier'
import { axes } from './modules/axes'
import { createStore, Module } from 'vuex-smart-module'

Vue.use(Vuex)

const module = new Module({
  modules: {
    canvas,
    dataset,
    magnifier,
    axes,
  },
})

const store = createStore(module)
export default store
