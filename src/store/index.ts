import Vue from 'vue'
import Vuex from 'vuex'
import { canvas } from './modules/canvas'
import { dataset } from './modules/dataset'
import { magnifier } from './modules/magnifier'
import { axes } from './modules/axes'
import { symbolExtractByArea } from './modules/symbolExtractByArea'
import { lineExtract } from './modules/lineExtract'
import { extractor } from './modules/extractor'
import { style } from './modules/style'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    canvas,
    dataset,
    magnifier,
    axes,
    symbolExtractByArea,
    lineExtract,
    extractor,
    style,
  },
})

export default store
