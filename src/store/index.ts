import { createApp } from 'vue'
import { createStore } from 'vuex'
// import { canvas } from './modules/canvas'
// import { dataset } from './modules/dataset'
// import { magnifier } from './modules/magnifier'
// import { axes } from './modules/axes'
// import { createStore, Module } from 'vuex-smart-module'
// import { symbolExtractByArea } from './modules/symbolExtractByArea'
// import { lineExtract } from './modules/lineExtract'
// import { extractor } from './modules/extractor'
// import { style } from './modules/style'

// const app = createApp()

// const module = new Module({
//   modules: {
//     canvas,
//     dataset,
//     magnifier,
//     axes,
//     symbolExtractByArea,
//     lineExtract,
//     extractor,
//     style,
//   },
// })

// const store = createStore({})

// export default store

// index.ts
import { useCanvasStore } from './modules/canvas'
// ... other store imports if needed

export {
  useCanvasStore,
  // ... export other store functions here
}
